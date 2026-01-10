/**
 * SOUND EFFECTS SERVICE
 * 
 * Provides audio feedback for game events using Web Audio API
 */

class SoundService {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.5;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    // Generate a tone using oscillator
    playTone(frequency, duration, type = 'sine', gainValue = this.volume) {
        if (!this.enabled) return;
        this.init();

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Dice roll sound - multiple quick tones
    diceRoll() {
        if (!this.enabled) return;

        const tones = [300, 400, 350, 450, 380];
        tones.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.05, 'square', this.volume * 0.3);
            }, i * 80);
        });
    }

    // Dice result reveal
    diceResult(value) {
        if (!this.enabled) return;

        const baseFreq = 400 + (value * 50);
        this.playTone(baseFreq, 0.2, 'sine', this.volume * 0.5);

        if (value === 6) {
            // Bonus sound for 6
            setTimeout(() => {
                this.playTone(600, 0.1, 'sine');
                setTimeout(() => this.playTone(800, 0.15, 'sine'), 100);
            }, 200);
        }
    }

    // Token move sound
    tokenMove() {
        if (!this.enabled) return;
        this.playTone(500, 0.08, 'sine', this.volume * 0.4);
    }

    // Token lands on cell
    tokenLand() {
        if (!this.enabled) return;
        this.playTone(300, 0.1, 'triangle', this.volume * 0.5);
    }

    // Capture sound - dramatic
    capture() {
        if (!this.enabled) return;

        this.playTone(200, 0.1, 'sawtooth', this.volume * 0.6);
        setTimeout(() => this.playTone(150, 0.15, 'sawtooth', this.volume * 0.5), 100);
        setTimeout(() => this.playTone(100, 0.2, 'sawtooth', this.volume * 0.4), 200);
    }

    // Token enters home
    homeEntry() {
        if (!this.enabled) return;

        const notes = [523, 659, 784]; // C5, E5, G5 - major chord
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, 'sine', this.volume * 0.4), i * 100);
        });
    }

    // Victory fanfare
    victory() {
        if (!this.enabled) return;

        const melody = [523, 659, 784, 1047]; // C5, E5, G5, C6
        melody.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.25, 'sine', this.volume * 0.5), i * 150);
        });

        // Final chord
        setTimeout(() => {
            this.playTone(523, 0.5, 'sine', this.volume * 0.3);
            this.playTone(659, 0.5, 'sine', this.volume * 0.3);
            this.playTone(784, 0.5, 'sine', this.volume * 0.3);
        }, 600);
    }

    // Error/Invalid move
    error() {
        if (!this.enabled) return;
        this.playTone(200, 0.15, 'square', this.volume * 0.3);
    }

    // Button click
    click() {
        if (!this.enabled) return;
        this.playTone(800, 0.03, 'sine', this.volume * 0.2);
    }
}

// Singleton instance
export const soundService = new SoundService();
export default soundService;
