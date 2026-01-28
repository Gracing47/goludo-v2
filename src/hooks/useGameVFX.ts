import { useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';
import soundManager from '../services/SoundManager';
import { PLAYER_COLORS } from '../engine/constants';

/**
 * useGameVFX Hook
 * 
 * Manages transient visual effects (explosions, sparkles) and audio feedback.
 * Decouples the "Juice" from the core game logic.
 */
export const useGameVFX = () => {
    const { setIsShaking } = useGameStore(useShallow((s) => ({
        setIsShaking: s.setIsShaking,
    })));

    const [captureEffects, setCaptureEffects] = useState([]);
    const [spawnEffects, setSpawnEffects] = useState([]);

    /**
     * Trigger a capture explosion effect
     */
    const triggerCapture = useCallback((victimColorIdx, row, col) => {
        const id = Date.now();
        const victimColor = PLAYER_COLORS[victimColorIdx];

        setCaptureEffects(prev => [...prev, {
            id,
            color: victimColor,
            row,
            col
        }]);

        setIsShaking(true);
        soundManager.play('capture');
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

        setTimeout(() => {
            setCaptureEffects(prev => prev.filter(e => e.id !== id));
        }, 500);

        setTimeout(() => setIsShaking(false), 500);
    }, [setIsShaking]);

    /**
     * Trigger a spawn sparkle effect
     */
    const triggerSpawn = useCallback((playerIdx, row, col) => {
        const id = Date.now();
        const color = PLAYER_COLORS[playerIdx];

        setSpawnEffects(prev => [...prev, {
            id,
            color,
            row,
            col
        }]);

        soundManager.play('spawn');

        setTimeout(() => {
            setSpawnEffects(prev => prev.filter(e => e.id !== id));
        }, 600);
    }, []);

    /**
     * Sound wrapper for common actions
     */
    const playSound = useCallback((type) => {
        soundManager.play(type);
    }, []);

    /**
     * Trigger penalty (e.g. Triple 6)
     */
    const triggerPenalty = useCallback(() => {
        soundManager.play('penalty');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }, []);

    return {
        captureEffects,
        spawnEffects,
        triggerCapture,
        triggerSpawn,
        playSound,
        triggerPenalty
    };
};
