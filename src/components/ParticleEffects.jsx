/**
 * PARTICLE EFFECTS COMPONENT
 * Iris AAA — capture explosions, victory confetti, spawn sparkles
 * GPU-only: animates transform + opacity only
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ParticleEffects.css';

// Iris neon palette — no purple
const PLAYER_COLORS = {
    red:    '#ff4757',
    green:  '#00d26a',
    yellow: '#ffbe0b',
    blue:   '#3a86ff'
};

// Iris confetti palette — vivid neon mix, no purple
const CONFETTI_COLORS = [
    '#ff4757', // neon red
    '#00d26a', // neon green
    '#ffbe0b', // neon gold
    '#3a86ff', // neon blue
    '#00f3ff', // neon cyan
    '#ff007a', // neon pink
    '#ffd700'  // gold
];

/**
 * Generate random particles for explosion effect
 */
function generateExplosionParticles(count, color) {
    const particles = [];
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const velocity = 90 + Math.random() * 70;
        const size = 4 + Math.random() * 7;

        particles.push({
            id: i,
            x: Math.cos(angle) * velocity,
            y: Math.sin(angle) * velocity,
            size,
            color,
            delay: Math.random() * 0.08,
            duration: 0.38 + Math.random() * 0.28
        });
    }
    return particles;
}

/**
 * Generate confetti particles for victory
 */
function generateConfettiParticles(count) {
    const particles = [];
    for (let i = 0; i < count; i++) {
        particles.push({
            id: i,
            x: (Math.random() - 0.5) * 320,
            y: -220 - Math.random() * 180,
            rotation: Math.random() * 720,
            size: 6 + Math.random() * 9,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            delay: Math.random() * 0.55,
            duration: 2 + Math.random() * 1.2
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
        setParticles(generateExplosionParticles(18, particleColor));

        const timer = setTimeout(() => {
            onComplete?.();
        }, 850);

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
            {/* Shockwave ring */}
            <motion.div
                className="shockwave-ring"
                initial={{ scale: 0, opacity: 0.9, borderWidth: '4px' }}
                animate={{ scale: 4.5, opacity: 0, borderWidth: '0px' }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                style={{ borderColor: PLAYER_COLORS[color] || '#fff' }}
            />

            {/* Second shockwave — trailing echo */}
            <motion.div
                className="shockwave-ring"
                initial={{ scale: 0, opacity: 0.5, borderWidth: '2px' }}
                animate={{ scale: 3.5, opacity: 0, borderWidth: '0px' }}
                transition={{ duration: 0.75, ease: 'easeOut', delay: 0.1 }}
                style={{ borderColor: PLAYER_COLORS[color] || '#fff' }}
            />

            {/* Central flash */}
            <motion.div
                className="explosion-flash"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
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
                            opacity: 0,
                            rotate: Math.random() * 360
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
                            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`
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
            setParticles(generateConfettiParticles(60));
        } else {
            setParticles([]);
        }
    }, [active]);

    if (!active) return null;

    const glowColor = PLAYER_COLORS[winnerColor] || '#00f3ff';

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
                            x: particle.x + (Math.random() - 0.5) * 120,
                            y: 500,
                            rotate: particle.rotation,
                            opacity: [1, 1, 0]
                        }}
                        transition={{
                            duration: particle.duration,
                            delay: particle.delay,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        style={{
                            width: particle.size,
                            height: particle.size * 1.6,
                            backgroundColor: particle.color,
                            borderRadius: '2px',
                            boxShadow: `0 0 6px ${particle.color}88`
                        }}
                    />
                ))}
            </AnimatePresence>

            {/* Winner glow bloom */}
            <motion.div
                className="winner-glow"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{
                    scale: [0.4, 1.3, 1],
                    opacity: [0, 0.5, 0.2]
                }}
                transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    repeatType: 'loop'
                }}
                style={{ backgroundColor: glowColor }}
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
                x: Math.cos(angle) * 32,
                y: Math.sin(angle) * 32,
                color: particleColor
            });
        }

        setSparkles(newSparkles);

        const timer = setTimeout(() => {
            onComplete?.();
        }, 520);

        return () => clearTimeout(timer);
    }, [color, onComplete]);

    if (!position) return null;

    return (
        <div
            className="particle-container sparkle"
            style={{ left: position.x, top: position.y }}
        >
            {/* Vertical light beam */}
            <motion.div
                className="light-beam"
                initial={{ height: 0, opacity: 0.9, y: 0 }}
                animate={{ height: 110, opacity: 0, y: -55 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                style={{ backgroundColor: PLAYER_COLORS[color] || '#fff' }}
            />

            {sparkles.map(sparkle => (
                <motion.div
                    key={sparkle.id}
                    className="sparkle-particle"
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{
                        x: sparkle.x,
                        y: sparkle.y,
                        scale: [0, 1.6, 0],
                        opacity: [1, 1, 0],
                        rotate: Math.random() * 180
                    }}
                    transition={{ duration: 0.42, ease: 'easeOut' }}
                    style={{ backgroundColor: sparkle.color }}
                />
            ))}
        </div>
    );
}

export default {
    CaptureExplosion,
    VictoryConfetti,
    SpawnSparkle
};
