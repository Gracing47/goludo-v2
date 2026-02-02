/**
 * SOUND MANAGER
 * Singleton service for handling game audio (SFX and BGM).
 * Supports global mute and local storage persistence.
 * Includes Web Audio API fallback for when assets are missing.
 */

class SoundManager {
    private muted: boolean;
    private bgm: HTMLAudioElement | null;
    private audioCtx: AudioContext;
    private soundMap: Record<string, string>;

    constructor() {
        this.muted = localStorage.getItem('goludo_muted') === 'true';
        this.bgm = null;

        // Define sound mappings
        this.soundMap = {
            roll: '/sounds/dice-roll.mp3',
            click: '/sounds/click.mp3',
            move: '/sounds/move.mp3',
            capture: '/sounds/capture.mp3',
            win: '/sounds/win.mp3',
            bgm: '/sounds/bgm-lofi.mp3'
        };

        // Web Audio Context for Synths (Fallback)
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
    }

    /**
     * Play a one-shot sound effect
     * @param key - The key of the sound to play (roll, click, etc.)
     */
    public play(key: string): void {
        if (this.muted) return;

        // Resume context if suspended (browser policy)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // Use Synth for immediate feedback (until assets are provided)
        this.playSynth(key);
    }

    /**
     * Play a synthesized sound (Premium AAA Quality)
     * @param key 
     */
    public playSynth(key: string): void {
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;

        switch (key) {
            case 'click':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
                break;

            case 'move':
                // Snappy "Klack" sound (Percussive AAA Quality)
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.04);

                gainNode.gain.setValueAtTime(0.12, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

                osc.start(now);
                osc.stop(now + 0.04);

                // Add a tiny bit of noise for the "click" texture
                this.playNoise(0.05, now, 0.02);
                break;

            case 'land':
                // Final landing - satisfying woody thud
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

                osc.start(now);
                osc.stop(now + 0.12);
                break;

            case 'roll':
                // Dice roll - rattling effect
                osc.type = 'square';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.linearRampToValueAtTime(60, now + 0.25);
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
                // Add rattle texture
                this.playNoise(0.08, now, 0.2);
                break;

            case 'spawn':
                // Token leaving yard - ascending tone
                osc.type = 'sine';
                osc.frequency.setValueAtTime(250, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;

            case 'capture':
                // Explosion-like capture sound
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(250, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
                gainNode.gain.setValueAtTime(0.35, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
                // Add impact noise
                this.playNoise(0.2, now, 0.2);
                break;

            case 'bonus':
                // Bonus move chime - ascending arpeggio
                this.playNote(523.25, now, 0.1);       // C5
                this.playNote(659.25, now + 0.08, 0.1); // E5
                this.playNote(783.99, now + 0.16, 0.2); // G5
                return;

            case 'home':
                // Token reaching home - triumphant
                this.playNote(392.00, now, 0.15);       // G4
                this.playNote(523.25, now + 0.1, 0.15); // C5
                this.playNote(659.25, now + 0.2, 0.3);  // E5
                return;

            case 'win':
                // Victory fanfare - Major Chord Arpeggio with sustain
                this.playNote(392.00, now, 0.3);        // G4
                this.playNote(523.25, now + 0.15, 0.3); // C5
                this.playNote(659.25, now + 0.3, 0.3);  // E5
                this.playNote(783.99, now + 0.45, 0.4); // G5
                this.playNote(1046.50, now + 0.6, 0.8); // C6 (hold)
                return;

            case 'penalty':
                // Triple-6 penalty - descending sad sound
                this.playNote(400, now, 0.15);
                this.playNote(300, now + 0.15, 0.15);
                this.playNote(200, now + 0.3, 0.3);
                return;

            case 'lose':
                // Game over for loser - sad descending minor chord
                this.playNote(329.63, now, 0.2);        // E4
                this.playNote(293.66, now + 0.15, 0.2); // D4
                this.playNote(261.63, now + 0.3, 0.3);  // C4
                this.playNote(196.00, now + 0.5, 0.5);  // G3 (low, sustained)
                return;

            default:
                // Fallback generic beep
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
        }
    }

    /**
     * Play noise burst (for impact/rattle effects)
     */
    public playNoise(volume: number, startTime: number, duration: number): void {
        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const noise = this.audioCtx.createBufferSource();
        const gain = this.audioCtx.createGain();

        noise.buffer = buffer;
        noise.connect(gain);
        gain.connect(this.audioCtx.destination);

        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        noise.start(startTime);
        noise.stop(startTime + duration);
    }

    public playNote(freq: number, startTime: number, duration: number): void {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    /**
     * Start Background Music
     */
    public playBGM(): void {
        if (this.bgm) return; // Already playing

        try {
            this.bgm = new Audio(this.soundMap.bgm);
            this.bgm.loop = true;
            this.bgm.volume = 0.3; // Lower volume for background

            if (!this.muted) {
                this.bgm.play().catch(e => {
                    // Autoplay policy might block this until interaction
                    console.log('BGM Autoplay blocked, waiting for interaction', e);
                });
            }
        } catch (err) {
            console.warn('BGM error:', err);
        }
    }

    /**
     * Stop Background Music
     */
    public stopBGM(): void {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm = null;
        }
    }

    /**
     * Toggle Mute State
     * @returns new mute state
     */
    public toggleMute(): boolean {
        this.muted = !this.muted;
        localStorage.setItem('goludo_muted', String(this.muted));

        if (this.muted) {
            if (this.bgm) this.bgm.pause();
            // Also suspend context
            if (this.audioCtx.state === 'running') {
                this.audioCtx.suspend();
            }
        } else {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            if (this.bgm) {
                this.bgm.play().catch(e => console.log('BGM Play failed:', e));
            } else {
                this.playBGM();
            }
        }

        return this.muted;
    }

    public isMuted(): boolean {
        return this.muted;
    }

    /**
     * Explicitly set mute state (for syncing with global store)
     * @param isMuted 
     */
    public setMuted(isMuted: boolean): void {
        if (this.muted === isMuted) return; // No change

        this.muted = isMuted;
        localStorage.setItem('goludo_muted', String(this.muted));

        if (this.muted) {
            if (this.bgm) this.bgm.pause();
            if (this.audioCtx.state === 'running') {
                this.audioCtx.suspend().catch(e => console.warn('Audio suspend failed', e));
            }
        } else {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(e => console.warn('Audio resume failed', e));
            }
            if (this.bgm) {
                this.bgm.play().catch(e => console.log('BGM Play failed:', e));
            } else {
                this.playBGM();
            }
        }
    }
}

// Export a single instance
const soundManager = new SoundManager();
export default soundManager;
