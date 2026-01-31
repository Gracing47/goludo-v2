import { useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';
import soundManager from '../services/SoundManager';
import { PLAYER_COLORS } from '../engine/constants';

interface CaptureEffect {
    id: number;
    color: string;
    row: number;
    col: number;
}

interface SpawnEffect {
    id: number;
    color: string;
    row: number;
    col: number;
}

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

    const [captureEffects, setCaptureEffects] = useState<CaptureEffect[]>([]);
    const [spawnEffects, setSpawnEffects] = useState<SpawnEffect[]>([]);

    /**
     * Trigger a capture explosion effect
     */
    const triggerCapture = useCallback((victimColorIdx: number, row: number, col: number) => {
        const id = Date.now();
        const victimColor = PLAYER_COLORS[victimColorIdx] ?? 'red'; // Fallback to red

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
    const triggerSpawn = useCallback((playerIdx: number, row: number, col: number) => {
        const id = Date.now();
        const color = PLAYER_COLORS[playerIdx] ?? 'red'; // Fallback to red

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
    const playSound = useCallback((type: string) => {
        try {
            soundManager.play(type);
        } catch (error) {
            console.warn(`[VFX] Failed to play sound '${type}':`, error);
        }
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
