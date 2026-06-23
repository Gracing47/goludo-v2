import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── IRIS palette — matches token vars but resolved for inline styles ──
// Player colours remapped to neon palette (not original game tokens)
const PLAYER_COLORS = [
    '#ff2a6d',   // player 0 — neon-pink / red
    '#00ff9d',   // player 1 — matrix-green
    '#ffcc00',   // player 2 — cyber-gold
    '#05d9e8',   // player 3 — neon-cyan / blue
];

// Dominant neon for ambient bloom — same order (intensity dialed ~30% down)
const BLOOM_COLORS = [
    'rgba(255, 0, 122,  0.13)',   // pink
    'rgba(0,  255, 157, 0.10)',   // green
    'rgba(255, 204,   0, 0.11)',  // gold
    'rgba(  0, 243, 255, 0.13)', // cyan
];

// Secondary accent for the cross-fade stripe (~30% softer)
const STRIPE_COLORS = [
    'rgba(58, 134, 255, 0.06)',   // blue stripe with pink player
    'rgba( 0, 243, 255, 0.05)',   // cyan stripe with green player
    'rgba(255, 0, 122,  0.05)',   // pink stripe with gold player
    'rgba(58, 134, 255, 0.06)',   // blue stripe with cyan player
];

// Radial origin anchored to board corners
const ORIGINS = [
    { x: '18%', y: '20%' },  // top-left   — player 0
    { x: '82%', y: '20%' },  // top-right  — player 1
    { x: '82%', y: '80%' },  // bot-right  — player 2
    { x: '18%', y: '80%' },  // bot-left   — player 3
];

export const AmbientLight = ({ activePlayer }) => {
    const idx      = typeof activePlayer === 'number' ? activePlayer : 0;
    const color    = PLAYER_COLORS[idx]  ?? 'transparent';
    const bloom    = BLOOM_COLORS[idx]   ?? 'rgba(0,243,255,0.12)';
    const stripe   = STRIPE_COLORS[idx]  ?? 'rgba(58,134,255,0.06)';
    const origin   = ORIGINS[idx]        ?? { x: '50%', y: '50%' };

    // Spotlight CSS position for the motion.div
    const spotStyle = {
        position: 'absolute',
        left: 0,
        top:  0,
        width: '70vw',
        height: '70vw',
        maxWidth: '600px',
        maxHeight: '600px',
        borderRadius: '50%',
        filter: 'blur(72px)',
        willChange: 'background, transform',
        pointerEvents: 'none',
    };

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        >
            {/* ── Wide ambient wash — fills entire background ── */}
            <motion.div
                animate={{
                    background:
                        `radial-gradient(ellipse 90% 70% at ${origin.x} ${origin.y},` +
                        ` ${bloom} 0%,` +
                        ` ${stripe} 45%,` +
                        ` transparent 75%)`
                }}
                transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }}
            />

            {/* ── Tight neon spotlight that tracks the active corner ── */}
            <motion.div
                initial={false}
                animate={{
                    x: origin.x,
                    y: origin.y,
                    background:
                        `radial-gradient(circle, ${color}22 0%, ${color}0d 30%, transparent 65%)`,
                }}
                transformTemplate={({ x, y }) => `translate3d(calc(${x} - 50%), calc(${y} - 50%), 0)`}
                transition={{
                    type: 'spring',
                    stiffness: 42,
                    damping: 18,
                }}
                style={spotStyle}
            />

            {/* ── Hard neon corona at the player's corner — tiny but vivid ── */}
            <motion.div
                animate={{
                    x: origin.x,
                    y: origin.y,
                    background:
                        `radial-gradient(circle, ${color}3c 0%, ${color}16 20%, transparent 50%)`,
                    boxShadow: `0 0 80px 20px ${color}11`,
                }}
                transformTemplate={({ x, y }) => `translate3d(calc(${x} - 50%), calc(${y} - 50%), 0)`}
                transition={{
                    type: 'spring',
                    stiffness: 50,
                    damping: 16,
                }}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '28vw',
                    height: '28vw',
                    maxWidth: '220px',
                    maxHeight: '220px',
                    borderRadius: '50%',
                    filter: 'blur(28px)',
                    willChange: 'background, transform',
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
};

export default AmbientLight;
