/**
 * Test Setup File
 * Configures testing environment
 */

import '@testing-library/jest-dom';

// Mock Web Audio API for sound tests
global.AudioContext = class AudioContext {
    createOscillator() {
        return {
            connect: () => { },
            start: () => { },
            stop: () => { },
            frequency: { value: 0 },
            type: 'sine'
        };
    }
    createGain() {
        return {
            connect: () => { },
            gain: {
                setValueAtTime: () => { },
                exponentialRampToValueAtTime: () => { }
            }
        };
    }
    get currentTime() { return 0; }
    get destination() { return {}; }
};

// Mock import.meta.env
global.import = {
    meta: {
        env: {
            VITE_DEEPSEEK_API_KEY: 'test-key',
            VITE_THIRDWEB_CLIENT_ID: 'test-client'
        }
    }
};
