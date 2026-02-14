/**
 * PARTICLE EFFECTS COMPONENT
 * Premium AAA-quality particle effects for game events
 * Supports: capture explosions, victory confetti, spawn sparkles
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ParticleEffects.css';

// Color map for player particles
const PLAYER_COLORS = {
    red: '#ff4757',
    green: '#00d26a',
    yellow: '#ffbe0b',
    blue: '#3a86ff'
};

/**
 * Generate random particles for explosion effect
 */
function generateExplosionParticles(count, color) {
    const particles = [];
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const velocity = 80 + Math.random() * 60;
        const size = 4 + Math.random() * 6;

        particles.push({
            id: i,
            x: Math.cos(angle) * velocity,
            y: Math.sin(angle) * velocity,
            size,
            color,
            delay: Math.random() * 0.1,
            duration: 0.4 + Math.random() * 0.3
        });
    }
    return particles;
}

/**
 * Generate confetti particles for victory
 */
function generateConfettiParticles(count) {
    const colors = ['#ff4757', '#00d26a', '#ffbe0b', '#3a86ff', '#a855f7', '#ff007a'];
    const particles = [];

    for (let i = 0; i < count; i++) {
        particles.push({
            id: i,
            x: (Math.random() - 0.5) * 300,
            y: -200 - Math.random() * 200,
            rotation: Math.random() * 720,
            size: 6 + Math.random() * 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 0.5,
            duration: 2 + Math.random() * 1
        });
    }
    return particles;
}

/**
 * Capture Explosion Effect
 */
export function CaptureExplosion({ position, color, onComplete }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const particleColor = PLAYER_COLORS[color] || '#ffffff';
        setParticles(generateExplosionParticles(16, particleColor));

        const timer = setTimeout(() => {
            onComplete?.();
        }, 800);

        return () => clearTimeout(timer);
    }, [color, onComplete]);

    if (!position) return null;

    return (
        <div
            className="particle-container explosion"
            style={{
                left: position.x,
                top: position.y
            }}
        >
            {/* Central flash */}
            <motion.div
                className="explosion-flash"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ backgroundColor: PLAYER_COLORS[color] || '#fff' }}
            />

            {/* Particles */}
            <AnimatePresence>
                {particles.map(particle => (
                    <motion.div
                        key={particle.id}
                        className="explosion-particle"
                        initial={{
                            x: 0,
                            y: 0,
                            scale: 1,
                            opacity: 1
                        }}
                        animate={{
                            x: particle.x,
                            y: particle.y,
                            scale: 0,
                            opacity: 0
                        }}
                        transition={{
                            duration: particle.duration,
                            delay: particle.delay,
                            ease: 'easeOut'
                        }}
                        style={{
                            width: particle.size,
                            height: particle.size,
                            backgroundColor: particle.color,
                            boxShadow: `0 0 ${particle.size}px ${particle.color}`
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

/**
 * Victory Confetti Effect
 */
export function VictoryConfetti({ active, winnerColor }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (active) {
            setParticles(generateConfettiParticles(50));
        } else {
            setParticles([]);
        }
    }, [active]);

    if (!active) return null;

    return (
        <div className="confetti-container">
            <AnimatePresence>
                {particles.map(particle => (
                    <motion.div
                        key={particle.id}
                        className="confetti-particle"
                        initial={{
                            x: particle.x,
                            y: particle.y,
                            rotate: 0,
                            opacity: 1
                        }}
                        animate={{
                            x: particle.x + (Math.random() - 0.5) * 100,
                            y: 400,
                            rotate: particle.rotation,
                            opacity: [1, 1, 0]
                        }}
                        transition={{
                            duration: particle.duration,
                            delay: particle.delay,
                            ease: 'easeIn'
                        }}
                        style={{
                            width: particle.size,
                            height: particle.size * 1.5,
                            backgroundColor: particle.color,
                            borderRadius: '2px'
                        }}
                    />
                ))}
            </AnimatePresence>

            {/* Winner glow pulse */}
            <motion.div
                className="winner-glow"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                    scale: [0.5, 1.2, 1],
                    opacity: [0, 0.6, 0.3]
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: 'loop'
                }}
                style={{
                    backgroundColor: PLAYER_COLORS[winnerColor] || '#a855f7'
                }}
            />
        </div>
    );
}

/**
 * Spawn Sparkle Effect
 */
export function SpawnSparkle({ position, color, onComplete }) {
    const [sparkles, setSparkles] = useState([]);

    useEffect(() => {
        const particleColor = PLAYER_COLORS[color] || '#ffffff';
        const newSparkles = [];

        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            newSparkles.push({
                id: i,
                x: Math.cos(angle) * 30,
                y: Math.sin(angle) * 30,
                color: particleColor
            });
        }

        setSparkles(newSparkles);

        const timer = setTimeout(() => {
            onComplete?.();
        }, 500);

        return () => clearTimeout(timer);
    }, [color, onComplete]);

    if (!position) return null;

    return (
        <div
            className="particle-container sparkle"
            style={{ left: position.x, top: position.y }}
        >
            {sparkles.map(sparkle => (
                <motion.div
                    key={sparkle.id}
                    className="sparkle-particle"
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{
                        x: sparkle.x,
                        y: sparkle.y,
                        scale: [0, 1.5, 0],
                        opacity: [1, 1, 0]
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{ backgroundColor: sparkle.color }}
                />
            ))}
        </div>
    );
}

/**
 * Game Effects Manager - Centralized effect triggering
 */
export function useGameEffects() {
    const [captureEffect, setCaptureEffect] = useState(null);
    const [spawnEffect, setSpawnEffect] = useState(null);
    const [victoryActive, setVictoryActive] = useState(false);
    const [winnerColor, setWinnerColor] = useState(null);

    const triggerCapture = (position, color) => {
        setCaptureEffect({ position, color, key: Date.now() });
    };

    const triggerSpawn = (position, color) => {
        setSpawnEffect({ position, color, key: Date.now() });
    };

    const triggerVictory = (color) => {
        setWinnerColor(color);
        setVictoryActive(true);
    };

    const clearCapture = () => setCaptureEffect(null);
    const clearSpawn = () => setSpawnEffect(null);
    const clearVictory = () => setVictoryActive(false);

    return {
        captureEffect,
        spawnEffect,
        victoryActive,
        winnerColor,
        triggerCapture,
        triggerSpawn,
        triggerVictory,
        clearCapture,
        clearSpawn,
        clearVictory
    };
}

export default {
    CaptureExplosion,
    VictoryConfetti,
    SpawnSparkle,
    useGameEffects
};
