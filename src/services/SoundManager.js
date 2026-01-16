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
     * Play a synthesized sound (Placeholder/Fallback)
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
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'move':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;

            case 'roll':
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.2);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;

            case 'capture':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.3);
                gainNode.gain.setValueAtTime(0.4, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;

            case 'win':
                // Major Chord Arpeggio
                this.playNote(523.25, now, 0.2); // C5
                this.playNote(659.25, now + 0.1, 0.2); // E5
                this.playNote(783.99, now + 0.2, 0.4); // G5
                this.playNote(1046.50, now + 0.3, 0.8); // C6
                return;
        }
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
}

// Export a single instance
const soundManager = new SoundManager();
export default soundManager;
