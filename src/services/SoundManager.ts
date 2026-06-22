/**
 * SOUND MANAGER  –  PROD-2  (Web Audio Pipeline)
 *
 * Architecture:
 *   AudioContext (lazy)
 *     └─ DynamicsCompressor (master glue)
 *         ├─ masterGain
 *         │   ├─ sfxBus   (one-shot SFX at full vol)
 *         │   └─ bgmBus   (looping BGM, ducked under SFX)
 *
 * Asset loading:
 *   fetch → arrayBuffer → decodeAudioData → cached AudioBuffer
 *   On 404 / decode-error → graceful fall-through to synth. Never throws.
 *
 * Playback:
 *   AudioBufferSourceNode created fresh per play (cheapest pooling strategy
 *   for one-shots). Round-robin pitch + gain micro-variation for anti-machinegun.
 *
 * Mute / localStorage persist unchanged from original contract.
 *
 * Public API (unchanged so all call-sites keep working):
 *   play(key)        – play SFX from asset or synth fallback
 *   playSynth(key)   – synth directly (public, call-sites may use it)
 *   playBGM()        – start looping background music
 *   stopBGM()        – stop BGM
 *   toggleMute()     – flip mute, returns new state
 *   setMuted(bool)   – explicit mute set (store sync)
 *   isMuted()        – query mute state
 */

// ─── Type helpers ────────────────────────────────────────────────────────────

type SoundKey =
    | 'roll' | 'click' | 'move' | 'capture' | 'win'
    | 'land' | 'spawn' | 'bonus' | 'home' | 'penalty'
    | 'lose' | 'success' | string; // allow unknown keys → synth default

interface PitchVariation {
    detuneValues: number[];
    gainValues: number[];
    index: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SOUND_MAP: Record<string, string> = {
    roll:    '/sounds/dice-roll.mp3',
    click:   '/sounds/click.mp3',
    move:    '/sounds/move.mp3',
    capture: '/sounds/capture.mp3',
    win:     '/sounds/win.mp3',
    bgm:     '/sounds/bgm-lofi.mp3',
};

const BGM_VOLUME  = 0.25;
const SFX_VOLUME  = 0.85;
const MASTER_VOLUME = 0.9;

// Anti-machinegun: slight detune (cents) and gain multiplier per round-robin slot
const VARIATION_SLOTS = 4;

// ─── SoundManager class ──────────────────────────────────────────────────────

class SoundManager {
    // ── state ──────────────────────────────────────────────────────────────
    private muted: boolean;

    // AudioContext and graph – created lazily on first user gesture
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sfxBus: GainNode | null = null;
    private bgmBus: GainNode | null = null;
    // BGM state
    private bgmSource: AudioBufferSourceNode | null = null;
    private bgmBuffer: AudioBuffer | null = null;
    private bgmLoading = false;

    // Asset cache: key → decoded AudioBuffer (null = load failed / not yet tried)
    private assetCache = new Map<string, AudioBuffer | null>();

    // Loading promises to avoid parallel fetches of the same asset
    private loadingPromises = new Map<string, Promise<AudioBuffer | null>>();

    // Round-robin pitch/gain variation tables
    private variations = new Map<string, PitchVariation>();

    constructor() {
        this.muted = localStorage.getItem('goludo_muted') === 'true';
    }

    // ── Context lifecycle ───────────────────────────────────────────────────

    /** Lazily create AudioContext + signal graph. Safe to call multiple times. */
    private ensureContext(): AudioContext {
        if (this.ctx) return this.ctx;

        const Ctx =
            (window as Window & { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext ?? AudioContext;

        const ctx = new Ctx();
        this.ctx = ctx;

        // Master compressor for glue / limiting
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 8;
        comp.ratio.value = 4;
        comp.attack.value = 0.003;
        comp.release.value = 0.15;
        comp.connect(ctx.destination);

        // Master gain
        const master = ctx.createGain();
        master.gain.value = MASTER_VOLUME;
        master.connect(comp);
        this.masterGain = master;

        // SFX bus
        const sfx = ctx.createGain();
        sfx.gain.value = SFX_VOLUME;
        sfx.connect(master);
        this.sfxBus = sfx;

        // BGM bus – lower, can duck further if needed
        const bgm = ctx.createGain();
        bgm.gain.value = BGM_VOLUME;
        bgm.connect(master);
        this.bgmBus = bgm;

        return ctx;
    }

    // ── Asset loading ───────────────────────────────────────────────────────

    /**
     * Fetch, decode and cache an audio asset.
     * Returns null gracefully on 404 / network error / decode error.
     */
    private async loadAsset(key: string): Promise<AudioBuffer | null> {
        // Already cached (may be null if prev load failed)
        if (this.assetCache.has(key)) {
            return this.assetCache.get(key) ?? null;
        }

        // Deduplicate parallel loads
        const existing = this.loadingPromises.get(key);
        if (existing) return existing;

        const url = SOUND_MAP[key];
        if (!url) {
            this.assetCache.set(key, null);
            return null;
        }

        const ctx = this.ctx;
        if (!ctx) {
            return null; // Context not ready yet; will retry naturally next play
        }

        const promise = (async (): Promise<AudioBuffer | null> => {
            try {
                const res = await fetch(url);
                if (!res.ok) {
                    // 404 or similar – asset doesn't exist yet, use synth
                    this.assetCache.set(key, null);
                    return null;
                }
                const arrayBuf = await res.arrayBuffer();
                const audioBuf = await ctx.decodeAudioData(arrayBuf);
                this.assetCache.set(key, audioBuf);
                return audioBuf;
            } catch {
                // Decode error or network error
                this.assetCache.set(key, null);
                return null;
            } finally {
                this.loadingPromises.delete(key);
            }
        })();

        this.loadingPromises.set(key, promise);
        return promise;
    }

    // ── Variation helpers ───────────────────────────────────────────────────

    /** Get or create the round-robin variation table for a given key. */
    private getVariation(key: string): { detune: number; gainMul: number } {
        let v = this.variations.get(key);
        if (!v) {
            // Spread detune ±30 cents and gain ±8% across slots
            const detuneValues = Array.from({ length: VARIATION_SLOTS }, (_, i) =>
                ((i / (VARIATION_SLOTS - 1)) * 60 - 30)
            );
            const gainValues = Array.from({ length: VARIATION_SLOTS }, (_, i) =>
                0.92 + (i / (VARIATION_SLOTS - 1)) * 0.16
            );
            // Shuffle once so consecutive plays don't ramp predictably
            for (let i = detuneValues.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [detuneValues[i], detuneValues[j]] = [detuneValues[j]!, detuneValues[i]!];
                [gainValues[i], gainValues[j]] = [gainValues[j]!, gainValues[i]!];
            }
            v = { detuneValues, gainValues, index: 0 };
            this.variations.set(key, v);
        }
        const slot = v.index % VARIATION_SLOTS;
        v.index = (v.index + 1) % VARIATION_SLOTS;
        return {
            detune: v.detuneValues[slot] ?? 0,
            gainMul: v.gainValues[slot] ?? 1,
        };
    }

    // ── SFX playback from AudioBuffer ───────────────────────────────────────

    /** Play a decoded AudioBuffer as a one-shot SFX with anti-machinegun variation. */
    private playBuffer(buf: AudioBuffer, key: string): void {
        const ctx = this.ctx;
        const bus = this.sfxBus;
        if (!ctx || !bus) return;

        const { detune, gainMul } = this.getVariation(key);

        const gainNode = ctx.createGain();
        gainNode.gain.value = gainMul;
        gainNode.connect(bus);

        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.detune.value = detune;
        src.connect(gainNode);
        src.start();
        // src auto-disconnects when finished (GC-able)
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Play a one-shot sound effect.
     * Tries real asset first; falls back to synth on 404/decode error.
     */
    public play(key: SoundKey): void {
        if (this.muted) return;

        // Lazily create context on first user gesture
        const ctx = this.ensureContext();

        // Resume if suspended (autoplay policy)
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => undefined);
        }

        // Try to use a cached buffer immediately (synchronous fast path)
        if (this.assetCache.has(key)) {
            const buf = this.assetCache.get(key) ?? null;
            if (buf) {
                this.playBuffer(buf, key);
                return;
            }
            // null cache means load failed → synth fallback
            this.playSynth(key);
            return;
        }

        // Asset not yet attempted – kick off async load, play synth immediately
        // so there is zero latency for the user on first play.
        this.playSynth(key);
        this.loadAsset(key).then(buf => {
            // Future plays will use the buffer; nothing to do here
            if (buf) {
                // Optionally pre-warm variation table
                this.getVariation(key);
            }
        }).catch(() => undefined);
    }

    /**
     * Play a synthesized sound (richer envelopes, multi-voice, feedback delay for
     * win/capture). Public so existing call-sites that call playSynth() directly
     * keep working.
     */
    public playSynth(key: SoundKey): void {
        if (this.muted) return;

        const ctx = this.ensureContext();
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => undefined);
        }

        const bus = this.sfxBus;
        if (!bus) return;

        const now = ctx.currentTime;

        // Helper: create an oscillator routed to sfxBus
        const osc = (
            type: OscillatorType,
            freq: number,
            startT: number,
            endT: number,
            gainPeak: number,
            detuneCents = 0,
        ): void => {
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.001, startT);
            g.gain.linearRampToValueAtTime(gainPeak, startT + 0.005);
            g.gain.exponentialRampToValueAtTime(0.001, endT);
            g.connect(bus);

            const o = ctx.createOscillator();
            o.type = type;
            o.frequency.value = freq;
            o.detune.value = detuneCents;
            o.connect(g);
            o.start(startT);
            o.stop(endT + 0.01);
        };

        // Helper: shaped noise burst (for impact/rattle)
        const noise = (vol: number, startT: number, dur: number, hpFreq = 0): void => {
            const sampleRate = ctx.sampleRate;
            const frameCount = Math.ceil(sampleRate * dur);
            const buf = ctx.createBuffer(1, frameCount, sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < frameCount; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frameCount, 1.5);
            }

            const g = ctx.createGain();
            g.gain.setValueAtTime(vol, startT);
            g.gain.exponentialRampToValueAtTime(0.001, startT + dur);

            if (hpFreq > 0) {
                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = hpFreq;
                hp.connect(g);
                g.connect(bus);

                const src = ctx.createBufferSource();
                src.buffer = buf;
                src.connect(hp);
                src.start(startT);
                src.stop(startT + dur);
            } else {
                g.connect(bus);
                const src = ctx.createBufferSource();
                src.buffer = buf;
                src.connect(g);
                src.start(startT);
                src.stop(startT + dur);
            }
        };

        // Helper: single note (sine, shaped gain)
        const note = (
            freq: number,
            startT: number,
            dur: number,
            gainPeak = 0.28,
            type: OscillatorType = 'sine',
            detuneCents = 0,
        ): void => {
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.001, startT);
            g.gain.linearRampToValueAtTime(gainPeak, startT + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, startT + dur);
            g.connect(bus);

            const o = ctx.createOscillator();
            o.type = type;
            o.frequency.value = freq;
            o.detune.value = detuneCents;
            o.connect(g);
            o.start(startT);
            o.stop(startT + dur + 0.02);
        };

        /**
         * Lightweight feedback-delay effect for richness on sustained sounds.
         * Adds a faint echo tap without external ConvolverNode (cheap, no IR).
         */
        const withFeedbackDelay = (
            playFn: () => void,
            delayTime = 0.18,
            feedback = 0.25,
            wetGain = 0.18,
        ): void => {
            const delay = ctx.createDelay(2.0);
            delay.delayTime.value = delayTime;

            const fbGain = ctx.createGain();
            fbGain.gain.value = feedback;

            const wet = ctx.createGain();
            wet.gain.value = wetGain;

            // Routing: delay → fbGain → delay (feedback loop)
            delay.connect(fbGain);
            fbGain.connect(delay);
            // Tap the bus through delay
            delay.connect(wet);
            wet.connect(bus);

            // Temporarily reroute sfxBus output through delay for this sound
            // Instead, we wire individual oscillators; playFn captures `bus`
            // so we inject a lightweight tap node:
            const tap = ctx.createGain();
            tap.gain.value = 0.35;
            tap.connect(delay);
            // playFn will call note/osc which already connect to `bus`.
            // We monkey-patch bus to also feed tap for the duration of playFn:
            bus.connect(tap);

            playFn();

            // Disconnect tap after the echo tail dies out (2 s)
            setTimeout(() => {
                try { bus.disconnect(tap); } catch { /* already gone */ }
            }, 2000);
        };

        // ── Sound definitions ──────────────────────────────────────────────

        switch (key) {
            case 'click': {
                // Crisp UI tap – two layers: transient sine + short noise tick
                osc('sine', 900, now, now + 0.07, 0.18);
                osc('sine', 450, now, now + 0.09, 0.10, -8);
                noise(0.06, now, 0.025, 2000);
                break;
            }

            case 'move': {
                // Snappy woody klack – percussive square sweep + noise
                osc('square', 700, now, now + 0.05, 0.13);
                // pitch sweep down
                (() => {
                    const g = ctx.createGain();
                    g.gain.setValueAtTime(0.12, now);
                    g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
                    g.connect(bus);
                    const o = ctx.createOscillator();
                    o.type = 'square';
                    o.frequency.setValueAtTime(700, now);
                    o.frequency.exponentialRampToValueAtTime(60, now + 0.05);
                    o.connect(g);
                    o.start(now);
                    o.stop(now + 0.06);
                })();
                noise(0.07, now, 0.03, 800);
                break;
            }

            case 'land': {
                // Satisfying woody thud on tile landing
                osc('triangle', 180, now, now + 0.13, 0.28);
                (() => {
                    const g = ctx.createGain();
                    g.gain.setValueAtTime(0.22, now);
                    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
                    g.connect(bus);
                    const o = ctx.createOscillator();
                    o.type = 'triangle';
                    o.frequency.setValueAtTime(160, now);
                    o.frequency.exponentialRampToValueAtTime(40, now + 0.13);
                    o.connect(g);
                    o.start(now);
                    o.stop(now + 0.14);
                })();
                noise(0.1, now, 0.05, 200);
                break;
            }

            case 'roll': {
                // Dice roll rattle – multiple noise bursts with slight frequency wobble
                for (let i = 0; i < 5; i++) {
                    const t = now + i * 0.04;
                    noise(0.09 - i * 0.01, t, 0.03, 300 + i * 80);
                    osc('square', 80 + i * 15, t, t + 0.025, 0.07 - i * 0.008);
                }
                // Final landing thud
                noise(0.12, now + 0.22, 0.04, 100);
                osc('triangle', 90, now + 0.22, now + 0.33, 0.18);
                break;
            }

            case 'spawn': {
                // Token leaving yard – bright ascending arp
                note(330, now, 0.1, 0.2, 'sine');
                note(494, now + 0.07, 0.1, 0.2, 'sine', -10);
                note(659, now + 0.14, 0.18, 0.25, 'sine', 8);
                note(988, now + 0.22, 0.25, 0.2, 'sine');
                break;
            }

            case 'capture': {
                // Explosive impact – sawtooth crash + chunky noise, small echo
                withFeedbackDelay(() => {
                    (() => {
                        const g = ctx.createGain();
                        g.gain.setValueAtTime(0.32, now);
                        g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                        g.connect(bus);
                        const o = ctx.createOscillator();
                        o.type = 'sawtooth';
                        o.frequency.setValueAtTime(280, now);
                        o.frequency.exponentialRampToValueAtTime(35, now + 0.38);
                        o.connect(g);
                        o.start(now);
                        o.stop(now + 0.42);
                    })();
                    // Sub thud
                    osc('sine', 60, now, now + 0.25, 0.4);
                    // Noise crash
                    noise(0.28, now, 0.25, 0);
                    noise(0.14, now + 0.02, 0.18, 600);
                }, 0.12, 0.22, 0.12);
                break;
            }

            case 'bonus': {
                // Ascending happy arp – C5 E5 G5
                note(523.25, now, 0.12, 0.26, 'sine');
                note(659.25, now + 0.09, 0.12, 0.26, 'sine', 5);
                note(783.99, now + 0.18, 0.22, 0.28, 'sine', -5);
                break;
            }

            case 'home': {
                // Token reaching home – triumphant G4 C5 E5
                note(392.00, now, 0.18, 0.28, 'sine');
                note(523.25, now + 0.12, 0.18, 0.28, 'sine', -7);
                note(659.25, now + 0.26, 0.35, 0.32, 'sine', 7);
                // Sparkle overtone
                note(1318.5, now + 0.26, 0.2, 0.10, 'sine');
                break;
            }

            case 'win': {
                // Victory fanfare – major chord arp with sustain + echo tail
                withFeedbackDelay(() => {
                    // G4 C5 E5 G5 C6 – two-voice slight detune for warmth
                    const freqs = [392.00, 523.25, 659.25, 783.99, 1046.50];
                    freqs.forEach((f, i) => {
                        const t = now + i * 0.18;
                        note(f, t, 0.4 - i * 0.02, 0.3 - i * 0.02, 'sine', -8);
                        note(f, t + 0.005, 0.4 - i * 0.02, 0.18, 'sine', 10);
                    });
                    // Sub-bass swell on the C6
                    note(130.81, now + 0.72, 0.9, 0.22, 'sine');
                }, 0.22, 0.28, 0.22);
                break;
            }

            case 'penalty': {
                // Triple-6 penalty – descending minor tritone
                note(400, now, 0.18, 0.22, 'sawtooth', 0);
                note(300, now + 0.18, 0.18, 0.22, 'sawtooth', -5);
                note(200, now + 0.36, 0.35, 0.25, 'sawtooth', 5);
                noise(0.05, now, 0.12, 400);
                break;
            }

            case 'lose': {
                // Sad descending minor chord sequence
                note(329.63, now, 0.22, 0.22, 'sine');        // E4
                note(293.66, now + 0.18, 0.22, 0.22, 'sine', -6); // D4
                note(261.63, now + 0.36, 0.32, 0.24, 'sine', 4); // C4
                note(196.00, now + 0.60, 0.55, 0.24, 'sine');  // G3
                // Low drone
                note(98.00, now + 0.60, 0.55, 0.15, 'sine', -5);
                break;
            }

            case 'success': {
                // Triumphant rising chord for successful on-chain claim
                withFeedbackDelay(() => {
                    note(523.25, now, 0.12, 0.26, 'sine');
                    note(659.25, now + 0.12, 0.12, 0.26, 'sine', -6);
                    note(783.99, now + 0.24, 0.14, 0.26, 'sine', 6);
                    note(1046.50, now + 0.38, 0.5, 0.28, 'sine');
                    // Shimmer
                    note(2093.00, now + 0.38, 0.3, 0.10, 'sine');
                }, 0.15, 0.2, 0.15);
                break;
            }

            default: {
                // Generic beep fallback
                osc('sine', 440, now, now + 0.12, 0.18);
                break;
            }
        }
    }

    // ── Noise / Note public helpers (kept for back-compat; call-sites may use) ──

    /** Play a white-noise burst routed to sfxBus. */
    public playNoise(volume: number, startTime: number, duration: number): void {
        if (this.muted) return;
        const ctx = this.ensureContext();
        const bus = this.sfxBus;
        if (!bus) return;

        const sampleRate = ctx.sampleRate;
        const frameCount = Math.ceil(sampleRate * duration);
        const buf = ctx.createBuffer(1, frameCount, sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frameCount, 2);
        }

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        gain.connect(bus);

        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(gain);
        src.start(startTime);
        src.stop(startTime + duration);
    }

    /** Play a single sine note routed to sfxBus. */
    public playNote(freq: number, startTime: number, duration: number): void {
        if (this.muted) return;
        const ctx = this.ensureContext();
        const bus = this.sfxBus;
        if (!bus) return;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        gain.connect(bus);

        const o = ctx.createOscillator();
        o.frequency.value = freq;
        o.connect(gain);
        o.start(startTime);
        o.stop(startTime + duration + 0.02);
    }

    // ── BGM ─────────────────────────────────────────────────────────────────

    /** Start looping background music. No-op if already playing. */
    public playBGM(): void {
        if (this.bgmSource) return; // Already playing
        if (this.bgmLoading) return; // Load in progress

        const ctx = this.ensureContext();
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => undefined);
        }

        const bus = this.bgmBus;
        if (!bus) return;

        // If we already have the buffer, start immediately
        if (this.bgmBuffer) {
            this._startBGMSource(this.bgmBuffer);
            return;
        }

        // Async load
        this.bgmLoading = true;
        this.loadAsset('bgm').then(buf => {
            this.bgmLoading = false;
            if (!buf) return; // Not available – silent BGM (no error)
            this.bgmBuffer = buf;
            if (!this.muted) {
                this._startBGMSource(buf);
            }
        }).catch(() => {
            this.bgmLoading = false;
        });
    }

    private _startBGMSource(buf: AudioBuffer): void {
        const ctx = this.ctx;
        const bus = this.bgmBus;
        if (!ctx || !bus || this.bgmSource) return;

        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(bus);
        src.start();
        this.bgmSource = src;

        // Auto-clean if the source ends unexpectedly (non-looping buffer edge case)
        src.onended = () => {
            if (this.bgmSource === src) {
                this.bgmSource = null;
            }
        };
    }

    /** Stop Background Music. */
    public stopBGM(): void {
        if (this.bgmSource) {
            try { this.bgmSource.stop(); } catch { /* already stopped */ }
            this.bgmSource = null;
        }
    }

    // ── Mute / unmute ───────────────────────────────────────────────────────

    /**
     * Toggle mute state.
     * @returns new mute state (true = muted)
     */
    public toggleMute(): boolean {
        this.muted = !this.muted;
        localStorage.setItem('goludo_muted', String(this.muted));
        this._applyMute();
        return this.muted;
    }

    /**
     * Explicitly set mute state (for syncing with global store).
     */
    public setMuted(isMuted: boolean): void {
        if (this.muted === isMuted) return;
        this.muted = isMuted;
        localStorage.setItem('goludo_muted', String(this.muted));
        this._applyMute();
    }

    public isMuted(): boolean {
        return this.muted;
    }

    /** Internal: apply mute state to audio graph. */
    private _applyMute(): void {
        if (this.muted) {
            // Ramp master gain to 0 (smooth mute, no click)
            if (this.masterGain && this.ctx) {
                this.masterGain.gain.linearRampToValueAtTime(
                    0,
                    this.ctx.currentTime + 0.05,
                );
            }
            this.stopBGM();
            // Suspend context to save battery
            if (this.ctx?.state === 'running') {
                this.ctx.suspend().catch(() => undefined);
            }
        } else {
            // Resume context before ramping gain back up
            if (this.ctx?.state === 'suspended') {
                this.ctx.resume().catch(() => undefined);
            }
            if (this.masterGain && this.ctx) {
                this.masterGain.gain.linearRampToValueAtTime(
                    MASTER_VOLUME,
                    (this.ctx.currentTime ?? 0) + 0.05,
                );
            }
            this.playBGM();
        }
    }
}

// Export a single instance
const soundManager = new SoundManager();
export default soundManager;
