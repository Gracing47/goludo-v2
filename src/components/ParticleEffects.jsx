/**
 * PARTICLE EFFECTS COMPONENT
 * Iris AAA — capture explosions, victory confetti, spawn sparkles
 * GPU-only: animates transform + opacity only
 * Pooled / capped particle counts · prefers-reduced-motion
 *
 * framer-motion REMOVED (perf sprint) — replaced with Web Animations API
 * (element.animate()) which runs on the compositor thread and is tree-shaken
 * away from framer-motion's 39 kB gzip bundle.
 */

import React, { useEffect, useState, useRef } from 'react';
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

const CONFETTI_COLORS = [
    '#ff2a6d', '#00ff9d', '#ffcc00', '#05d9e8',
    '#3a86ff', '#ff007a', '#ffd700'
];

// ---------------------------------------------------------------------------
// Reduced-motion detection
// ---------------------------------------------------------------------------

function prefersReducedMotion() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// Particle factories — capped counts for perf
// ---------------------------------------------------------------------------

const MAX_EXPLOSION  = 16;
const MAX_CONFETTI   = 48;
const MAX_SPARKLE    = 8;

// Perf-low caps — applied when html.perf-low is present
const MAX_EXPLOSION_LOW = 6;
const MAX_CONFETTI_LOW  = 12;
const MAX_SPARKLE_LOW   = 4;

function isPerfLow() {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('perf-low');
}

function generateExplosionParticles(count, color) {
    const cap = Math.min(count, isPerfLow() ? MAX_EXPLOSION_LOW : MAX_EXPLOSION);
    const particles = [];
    for (let i = 0; i < cap; i++) {
        const angle    = (Math.PI * 2 * i) / cap + (Math.random() - 0.5) * 0.45;
        const velocity = 80 + Math.random() * 80;
        const size     = 4 + Math.random() * 7;
        particles.push({
            id: i, x: Math.cos(angle) * velocity, y: Math.sin(angle) * velocity,
            size, color, rotate: Math.random() * 360,
            delay: Math.random() * 0.07, duration: 0.36 + Math.random() * 0.30
        });
    }
    return particles;
}

function generateHomeParticles(count, color) {
    const cap = Math.min(count, isPerfLow() ? MAX_EXPLOSION_LOW : MAX_EXPLOSION);
    const particles = [];
    for (let i = 0; i < cap; i++) {
        const angle    = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.4;
        const velocity = 60 + Math.random() * 100;
        const size     = 5 + Math.random() * 8;
        particles.push({
            id: i, x: Math.cos(angle) * velocity, y: Math.sin(angle) * velocity,
            size, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            rotate: Math.random() * 540,
            delay: Math.random() * 0.12, duration: 0.50 + Math.random() * 0.40
        });
    }
    return particles;
}

function generateConfettiParticles(count, winnerHex) {
    const cap = Math.min(count, isPerfLow() ? MAX_CONFETTI_LOW : MAX_CONFETTI);
    const particles = [];
    for (let i = 0; i < cap; i++) {
        const useWinnerColor = winnerHex && i % 3 === 0;
        particles.push({
            id: i,
            x: (Math.random() - 0.5) * 340, destX: (Math.random() - 0.5) * 140,
            y: -200 - Math.random() * 200,
            rotation: Math.random() * 720,
            size: 6 + Math.random() * 9,
            color: useWinnerColor
                ? winnerHex
                : CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            delay: Math.random() * 0.60, duration: 2.2 + Math.random() * 1.3
        });
    }
    return particles;
}

// ---------------------------------------------------------------------------
// useParticleRefs — runs Web Animations on mounted particle elements
// ---------------------------------------------------------------------------

function useParticleAnimation(containerRef, particles, animateFn) {
    useEffect(() => {
        if (!containerRef.current || !particles.length) return;
        const els = containerRef.current.querySelectorAll('[data-particle]');
        els.forEach((el, i) => {
            const p = particles[i];
            if (!p) return;
            animateFn(el, p);
        });
    }, [particles]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---------------------------------------------------------------------------
// CaptureExplosion — real impact burst
// ---------------------------------------------------------------------------

export function CaptureExplosion({ position, color, onComplete }) {
    const [particles, setParticles] = useState([]);
    const containerRef = useRef(null);
    const reduced = prefersReducedMotion();

    useEffect(() => {
        const particleColor = PLAYER_COLORS[color] || '#ffffff';
        if (!reduced) setParticles(generateExplosionParticles(MAX_EXPLOSION, particleColor));
        const timer = setTimeout(() => { onComplete?.(); }, reduced ? 0 : 880);
        return () => clearTimeout(timer);
    }, [color, onComplete, reduced]);

    useParticleAnimation(containerRef, particles, (el, p) => {
        el.animate(
            [
                { transform: `translate(0, 0) scale(1) rotate(0deg)`, opacity: 1 },
                { transform: `translate(${p.x}px, ${p.y}px) scale(0) rotate(${p.rotate}deg)`, opacity: 0 },
            ],
            { duration: p.duration * 1000, delay: p.delay * 1000, easing: 'ease-out', fill: 'both' }
        );
    });

    if (!position || reduced) return null;

    const ringColor = PLAYER_COLORS[color] || '#ffffff';

    return (
        <div
            ref={containerRef}
            className="particle-container explosion"
            style={{ left: position.x, top: position.y }}
        >
            {/* Shockwave rings — CSS keyframe */}
            <div className="shockwave-ring shockwave-1" style={{ borderColor: ringColor }} />
            <div className="shockwave-ring shockwave-2" style={{ borderColor: ringColor }} />
            <div className="shockwave-ring shockwave-shimmer shockwave-3" style={{ borderColor: ringColor }} />
            <div className="explosion-flash flash-1" style={{ backgroundColor: ringColor }} />

            {particles.map(p => (
                <div
                    key={p.id}
                    data-particle
                    className="explosion-particle"
                    style={{
                        width: p.size, height: p.size,
                        backgroundColor: p.color,
                        boxShadow: `0 0 ${p.size * 2}px ${p.color}`
                    }}
                />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// HomeArrivalBurst — celebratory upward burst
// ---------------------------------------------------------------------------

export function HomeArrivalBurst({ position, color, onComplete }) {
    const [particles, setParticles] = useState([]);
    const containerRef = useRef(null);
    const reduced = prefersReducedMotion();

    useEffect(() => {
        const baseColor = PLAYER_COLORS[color] || '#ffd700';
        if (!reduced) setParticles(generateHomeParticles(MAX_EXPLOSION, baseColor));
        const timer = setTimeout(() => { onComplete?.(); }, reduced ? 0 : 1100);
        return () => clearTimeout(timer);
    }, [color, onComplete, reduced]);

    useParticleAnimation(containerRef, particles, (el, p) => {
        el.animate(
            [
                { transform: `translate(0, 0) scale(1) rotate(0deg)`, opacity: 1 },
                { transform: `translate(${p.x}px, ${p.y}px) scale(0) rotate(${p.rotate}deg)`, opacity: 0 },
            ],
            { duration: p.duration * 1000, delay: p.delay * 1000, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'both' }
        );
    });

    if (!position || reduced) return null;

    const glowColor = PLAYER_COLORS[color] || '#ffd700';

    return (
        <div
            ref={containerRef}
            className="particle-container home-burst"
            style={{ left: position.x, top: position.y }}
        >
            <div className="shockwave-ring shockwave-gold-1" style={{ borderColor: '#ffd700' }} />
            <div className="explosion-flash flash-gold" style={{ backgroundColor: '#ffd700' }} />
            <div className="explosion-flash flash-player" style={{ backgroundColor: glowColor }} />

            {particles.map(p => (
                <div
                    key={p.id}
                    data-particle
                    className="explosion-particle"
                    style={{
                        width: p.size, height: p.size,
                        backgroundColor: p.color,
                        boxShadow: `0 0 ${p.size * 2.5}px ${p.color}, 0 0 ${p.size * 5}px ${p.color}55`
                    }}
                />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// VictoryConfetti — premium animated confetti rain
// ---------------------------------------------------------------------------

export function VictoryConfetti({ active, winnerColor }) {
    const [particles, setParticles] = useState([]);
    const containerRef = useRef(null);
    const reduced = prefersReducedMotion();

    const glowColor = PLAYER_COLORS[winnerColor] || '#00f3ff';

    useEffect(() => {
        if (active && !reduced) setParticles(generateConfettiParticles(MAX_CONFETTI, glowColor));
        else setParticles([]);
    }, [active, reduced, glowColor]);

    useParticleAnimation(containerRef, particles, (el, p) => {
        el.animate(
            [
                { transform: `translate(${p.x}px, ${p.y}px) rotate(0deg)`, opacity: 1 },
                { transform: `translate(${p.x + p.destX}px, 520px) rotate(${p.rotation}deg)`, opacity: 0 },
            ],
            { duration: p.duration * 1000, delay: p.delay * 1000, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'both' }
        );
    });

    if (!active || reduced) return null;

    return (
        <div ref={containerRef} className="confetti-container">
            {particles.map(p => (
                <div
                    key={p.id}
                    data-particle
                    className="confetti-particle"
                    style={{
                        width: p.size, height: p.size * 1.7,
                        backgroundColor: p.color,
                        borderRadius: '2px',
                        boxShadow: `0 0 ${p.size * 1.5}px ${p.color}cc, 0 0 ${p.size * 3}px ${p.color}55`
                    }}
                />
            ))}

            {/* Winner glow bloom — CSS keyframe */}
            <div className="winner-glow winner-glow-pulse" style={{ backgroundColor: glowColor }} />
            <div className="winner-glow winner-glow-secondary winner-glow-ring" style={{ backgroundColor: '#ffd700' }} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// SpawnSparkle — clean spawn reaction
// ---------------------------------------------------------------------------

export function SpawnSparkle({ position, color, onComplete }) {
    const [sparkles, setSparkles] = useState([]);
    const containerRef = useRef(null);
    const reduced = prefersReducedMotion();

    useEffect(() => {
        const particleColor = PLAYER_COLORS[color] || '#ffffff';
        if (!reduced) {
            const newSparkles = [];
            const sparkleCount = isPerfLow() ? MAX_SPARKLE_LOW : MAX_SPARKLE;
            for (let i = 0; i < sparkleCount; i++) {
                const angle = (Math.PI * 2 * i) / sparkleCount;
                newSparkles.push({
                    id: i,
                    x: Math.cos(angle) * 36, y: Math.sin(angle) * 36,
                    color: particleColor,
                    rotate: Math.random() * 180
                });
            }
            setSparkles(newSparkles);
        }
        const timer = setTimeout(() => { onComplete?.(); }, reduced ? 0 : 540);
        return () => clearTimeout(timer);
    }, [color, onComplete, reduced]);

    useParticleAnimation(containerRef, sparkles, (el, s) => {
        el.animate(
            [
                { transform: `translate(0, 0) scale(0) rotate(0deg)`, opacity: 1 },
                { transform: `translate(${s.x}px, ${s.y}px) scale(1.8) rotate(${s.rotate}deg)`, opacity: 1, offset: 0.5 },
                { transform: `translate(${s.x}px, ${s.y}px) scale(0) rotate(${s.rotate}deg)`, opacity: 0 },
            ],
            { duration: 440, easing: 'ease-out', fill: 'both' }
        );
    });

    if (!position || reduced) return null;

    return (
        <div
            ref={containerRef}
            className="particle-container sparkle"
            style={{ left: position.x, top: position.y }}
        >
            <div
                className="light-beam light-beam-animated"
                style={{ backgroundColor: PLAYER_COLORS[color] || '#fff' }}
            />
            {sparkles.map(s => (
                <div
                    key={s.id}
                    data-particle
                    className="sparkle-particle"
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
