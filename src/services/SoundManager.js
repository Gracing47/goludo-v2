/**
 * SOUND MANAGER
 * Singleton service for handling game audio (SFX and BGM).
 * Supports global mute and local storage persistence.
 * Includes Web Audio API fallback for when assets are missing.
 */

class SoundManager {
    constructor() {
        this.muted = localStorage.getItem('goludo_muted') === 'true';
        this.bgm = null;
        this.sounds = {};

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
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    /**
     * Play a one-shot sound effect
     * @param {string} key - The key of the sound to play (roll, click, etc.)
     */
    play(key) {
        if (this.muted) return;

        // Resume context if suspended (browser policy)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const src = this.soundMap[key];

        // Use Synth for immediate feedback (until assets are provided)
        this.playSynth(key);

        /* 
        // Real implementation with Asset Priority:
        if (src) {
             const audio = new Audio(src);
             audio.volume = 0.6;
             if (key === 'move') audio.playbackRate = 0.9 + Math.random() * 0.2;
             audio.play().catch(e => {
                 this.playSynth(key); // Fallback to synth if file missing/error
             });
        }
        */
    }

    /**
     * Play a synthesized sound (Premium AAA Quality)
     * @param {string} key 
     */
    playSynth(key) {
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
                // Soft hop sound
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(350, now + 0.06);
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
                osc.start(now);
                osc.stop(now + 0.06);
                break;

            case 'land':
                // Token landing - satisfying thud
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
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
    playNoise(volume, startTime, duration) {
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

    playNote(freq, startTime, duration) {
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
    playBGM() {
        if (this.bgm) return; // Already playing

        try {
            this.bgm = new Audio(this.soundMap.bgm);
            this.bgm.loop = true;
            this.bgm.volume = 0.3; // Lower volume for background

            if (!this.muted) {
                this.bgm.play().catch(e => {
                    // Autoplay policy might block this until interaction
                    console.log('BGM Autoplay blocked, waiting for interaction');
                });
            }
        } catch (err) {
            console.warn('BGM error:', err);
        }
    }

    /**
     * Stop Background Music
     */
    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm = null;
        }
    }

    /**
     * Toggle Mute State
     * @returns {boolean} new mute state
     */
    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('goludo_muted', this.muted);

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

    isMuted() {
        return this.muted;
    }

    /**
     * Explicitly set mute state (for syncing with global store)
     * @param {boolean} isMuted 
     */
    setMuted(isMuted) {
        if (this.muted === isMuted) return; // No change

        this.muted = isMuted;
        localStorage.setItem('goludo_muted', this.muted);

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
