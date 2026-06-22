/**
 * PARTICLE EFFECTS COMPONENT
 * Iris AAA — capture explosions, victory confetti, spawn sparkles
 * GPU-only: animates transform + opacity only
 * Pooled / capped particle counts · prefers-reduced-motion
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ParticleEffects.css';

// ---------------------------------------------------------------------------
// Palette — Iris neon, no purple
// ---------------------------------------------------------------------------

const PLAYER_COLORS = {
    red:    '#ff2a6d',
    green:  '#00ff9d',
    yellow: '#ffcc00',
    blue:   '#05d9e8'
};

// Confetti palette — vivid neon mix, no purple
const CONFETTI_COLORS = [
    '#ff2a6d', // neon red
    '#00ff9d', // neon green
    '#ffcc00', // neon gold
    '#05d9e8', // neon cyan
    '#3a86ff', // neon blue
    '#ff007a', // neon pink
    '#ffd700'  // gold
];

// ---------------------------------------------------------------------------
// Reduced-motion detection — single shared check at module scope
// ---------------------------------------------------------------------------

function prefersReducedMotion() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// Particle factories — capped counts for perf
// ---------------------------------------------------------------------------

const MAX_EXPLOSION  = 16; // was 18 — trimmed for GPU budget
const MAX_CONFETTI   = 48; // was 60
const MAX_SPARKLE    = 8;

function generateExplosionParticles(count, color) {
    const cap = Math.min(count, MAX_EXPLOSION);
    const particles = [];
    for (let i = 0; i < cap; i++) {
        const angle    = (Math.PI * 2 * i) / cap + (Math.random() - 0.5) * 0.45;
        const velocity = 80 + Math.random() * 80;
        const size     = 4 + Math.random() * 7;
        particles.push({
            id: i,
            x: Math.cos(angle) * velocity,
            y: Math.sin(angle) * velocity,
            size,
            color,
            delay:    Math.random() * 0.07,
            duration: 0.36 + Math.random() * 0.30
        });
    }
    return particles;
}

function generateHomeParticles(count, color) {
    // Celebratory upward burst for home-arrival / win moment
    const cap = Math.min(count, MAX_EXPLOSION);
    const particles = [];
    for (let i = 0; i < cap; i++) {
        const angle    = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.4;
        const velocity = 60 + Math.random() * 100;
        const size     = 5 + Math.random() * 8;
        particles.push({
            id: i,
            x: Math.cos(angle) * velocity,
            y: Math.sin(angle) * velocity,
            size,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            delay:    Math.random() * 0.12,
            duration: 0.50 + Math.random() * 0.40
        });
    }
    return particles;
}

function generateConfettiParticles(count) {
    const cap = Math.min(count, MAX_CONFETTI);
    const particles = [];
    for (let i = 0; i < cap; i++) {
        particles.push({
            id: i,
            x:        (Math.random() - 0.5) * 340,
            y:        -200 - Math.random() * 200,
            rotation: Math.random() * 720,
            size:     6 + Math.random() * 9,
            color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            delay:    Math.random() * 0.60,
            duration: 2.2 + Math.random() * 1.3
        });
    }
    return particles;
}

// ---------------------------------------------------------------------------
// CaptureExplosion — real impact burst
// ---------------------------------------------------------------------------

export function CaptureExplosion({ position, color, onComplete }) {
    const [particles, setParticles] = useState([]);
    const reduced = prefersReducedMotion();

    useEffect(() => {
        const particleColor = PLAYER_COLORS[color] || '#ffffff';
        if (!reduced) {
            setParticles(generateExplosionParticles(MAX_EXPLOSION, particleColor));
        }

        const timer = setTimeout(() => {
            onComplete?.();
        }, reduced ? 0 : 880);

        return () => clearTimeout(timer);
    }, [color, onComplete, reduced]);

    if (!position) return null;
    if (reduced) return null; // skip rendering entirely under prefers-reduced-motion

    const ringColor = PLAYER_COLORS[color] || '#ffffff';

    return (
        <div
            className="particle-container explosion"
            style={{ left: position.x, top: position.y }}
        >
            {/* Primary shockwave ring */}
            <motion.div
                className="shockwave-ring"
                initial={{ scale: 0,   opacity: 0.95, borderWidth: '4px' }}
                animate={{ scale: 5,   opacity: 0,    borderWidth: '0px' }}
                transition={{ duration: 0.62, ease: 'easeOut' }}
                style={{ borderColor: ringColor }}
            />

            {/* Echo shockwave */}
            <motion.div
                className="shockwave-ring"
                initial={{ scale: 0,   opacity: 0.55, borderWidth: '2px' }}
                animate={{ scale: 3.8, opacity: 0,    borderWidth: '0px' }}
                transition={{ duration: 0.75, ease: 'easeOut', delay: 0.10 }}
                style={{ borderColor: ringColor }}
            />

            {/* Third shimmer ring — premium extra */}
            <motion.div
                className="shockwave-ring shockwave-shimmer"
                initial={{ scale: 0, opacity: 0.30, borderWidth: '1px' }}
                animate={{ scale: 7, opacity: 0,    borderWidth: '0px' }}
                transition={{ duration: 0.95, ease: 'easeOut', delay: 0.18 }}
                style={{ borderColor: ringColor }}
            />

            {/* Central flash */}
            <motion.div
                className="explosion-flash"
                initial={{ scale: 0, opacity: 1    }}
                animate={{ scale: 3, opacity: 0    }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                style={{ backgroundColor: ringColor }}
            />

            {/* Particles */}
            <AnimatePresence>
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        className="explosion-particle"
                        initial={{ x: 0,    y: 0,    scale: 1, opacity: 1 }}
                        animate={{ x: p.x,  y: p.y,  scale: 0, opacity: 0, rotate: Math.random() * 360 }}
                        transition={{
                            duration: p.duration,
                            delay:    p.delay,
                            ease:     'easeOut'
                        }}
                        style={{
                            width:      p.size,
                            height:     p.size,
                            backgroundColor: p.color,
                            boxShadow: `0 0 ${p.size * 2}px ${p.color}`
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

// ---------------------------------------------------------------------------
// HomeArrivalBurst — celebratory upward burst when token reaches home/wins
// ---------------------------------------------------------------------------

export function HomeArrivalBurst({ position, color, onComplete }) {
    const [particles, setParticles] = useState([]);
    const reduced = prefersReducedMotion();

    useEffect(() => {
        const baseColor = PLAYER_COLORS[color] || '#ffd700';
        if (!reduced) {
            setParticles(generateHomeParticles(MAX_EXPLOSION, baseColor));
        }

        const timer = setTimeout(() => {
            onComplete?.();
        }, reduced ? 0 : 1100);

        return () => clearTimeout(timer);
    }, [color, onComplete, reduced]);

    if (!position) return null;
    if (reduced) return null;

    const glowColor = PLAYER_COLORS[color] || '#ffd700';

    return (
        <div
            className="particle-container home-burst"
            style={{ left: position.x, top: position.y }}
        >
            {/* Gold starburst ring */}
            <motion.div
                className="shockwave-ring"
                initial={{ scale: 0, opacity: 1,    borderWidth: '3px' }}
                animate={{ scale: 6, opacity: 0,    borderWidth: '0px' }}
                transition={{ duration: 0.80, ease: 'easeOut' }}
                style={{ borderColor: '#ffd700' }}
            />

            {/* Inner flash */}
            <motion.div
                className="explosion-flash"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ backgroundColor: '#ffd700' }}
            />

            {/* Player-color secondary flash */}
            <motion.div
                className="explosion-flash"
                initial={{ scale: 0, opacity: 0.85 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: 0.06 }}
                style={{ backgroundColor: glowColor }}
            />

            {/* Multi-color particles */}
            <AnimatePresence>
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        className="explosion-particle"
                        initial={{ x: 0,   y: 0,   scale: 1, opacity: 1 }}
                        animate={{ x: p.x, y: p.y, scale: 0, opacity: 0, rotate: Math.random() * 540 }}
                        transition={{
                            duration: p.duration,
                            delay:    p.delay,
                            ease:     [0.22, 1, 0.36, 1]
                        }}
                        style={{
                            width:      p.size,
                            height:     p.size,
                            backgroundColor: p.color,
                            boxShadow: `0 0 ${p.size * 2.5}px ${p.color}, 0 0 ${p.size * 5}px ${p.color}55`
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

// ---------------------------------------------------------------------------
// VictoryConfetti — premium animated confetti rain
// ---------------------------------------------------------------------------

export function VictoryConfetti({ active, winnerColor }) {
    const [particles, setParticles] = useState([]);
    const reduced = prefersReducedMotion();

    useEffect(() => {
        if (active && !reduced) {
            setParticles(generateConfettiParticles(MAX_CONFETTI));
        } else {
            setParticles([]);
        }
    }, [active, reduced]);

    if (!active) return null;
    if (reduced) return null;

    const glowColor = PLAYER_COLORS[winnerColor] || '#00f3ff';

    return (
        <div className="confetti-container">
            <AnimatePresence>
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        className="confetti-particle"
                        initial={{ x: p.x, y: p.y, rotate: 0, opacity: 1 }}
                        animate={{
                            x:       p.x + (Math.random() - 0.5) * 140,
                            y:       520,
                            rotate:  p.rotation,
                            opacity: [1, 1, 0]
                        }}
                        transition={{
                            duration: p.duration,
                            delay:    p.delay,
                            ease:     [0.22, 1, 0.36, 1]
                        }}
                        style={{
                            width:        p.size,
                            height:       p.size * 1.7,
                            backgroundColor: p.color,
                            borderRadius: '2px',
                            boxShadow:    `0 0 8px ${p.color}99`
                        }}
                    />
                ))}
            </AnimatePresence>

            {/* Winner glow bloom */}
            <motion.div
                className="winner-glow"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{
                    scale:   [0.3, 1.4, 0.95, 1.1, 1],
                    opacity: [0,   0.55, 0.30, 0.38, 0.22]
                }}
                transition={{
                    duration:    2.0,
                    repeat:      Infinity,
                    repeatType:  'loop',
                    repeatDelay: 0.3
                }}
                style={{ backgroundColor: glowColor }}
            />

            {/* Secondary ring glow */}
            <motion.div
                className="winner-glow winner-glow-secondary"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                    scale:   [0.5, 1.8, 1.2],
                    opacity: [0,   0.22, 0]
                }}
                transition={{
                    duration:    2.5,
                    repeat:      Infinity,
                    repeatType:  'loop',
                    delay:       0.8
                }}
                style={{ backgroundColor: '#ffd700' }}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// SpawnSparkle — clean spawn reaction
// ---------------------------------------------------------------------------

export function SpawnSparkle({ position, color, onComplete }) {
    const [sparkles, setSparkles] = useState([]);
    const reduced = prefersReducedMotion();

    useEffect(() => {
        const particleColor = PLAYER_COLORS[color] || '#ffffff';
        if (!reduced) {
            const newSparkles = [];
            for (let i = 0; i < MAX_SPARKLE; i++) {
                const angle = (Math.PI * 2 * i) / MAX_SPARKLE;
                newSparkles.push({
                    id:    i,
                    x:     Math.cos(angle) * 36,
                    y:     Math.sin(angle) * 36,
                    color: particleColor
                });
            }
            setSparkles(newSparkles);
        }

        const timer = setTimeout(() => {
            onComplete?.();
        }, reduced ? 0 : 540);

        return () => clearTimeout(timer);
    }, [color, onComplete, reduced]);

    if (!position) return null;
    if (reduced) return null;

    return (
        <div
            className="particle-container sparkle"
            style={{ left: position.x, top: position.y }}
        >
            {/* Vertical light beam */}
            <motion.div
                className="light-beam"
                initial={{ height: 0,   opacity: 0.95, y: 0   }}
                animate={{ height: 120, opacity: 0,    y: -60  }}
                transition={{ duration: 0.52, ease: 'easeOut' }}
                style={{ backgroundColor: PLAYER_COLORS[color] || '#fff' }}
            />

            {sparkles.map(s => (
                <motion.div
                    key={s.id}
                    className="sparkle-particle"
                    initial={{ x: 0,   y: 0,   scale: 0,         opacity: 1 }}
                    animate={{ x: s.x, y: s.y, scale: [0, 1.8, 0], opacity: [1, 1, 0], rotate: Math.random() * 180 }}
                    transition={{ duration: 0.44, ease: 'easeOut' }}
                    style={{ backgroundColor: s.color }}
                />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Default export (named exports are primary usage)
// ---------------------------------------------------------------------------

export default {
    CaptureExplosion,
    HomeArrivalBurst,
    VictoryConfetti,
    SpawnSparkle
};
