import React from 'react';

// ── IRIS palette — matches token vars but resolved for inline styles ──
const PLAYER_COLORS = [
    '#ff2a6d',   // player 0 — neon-pink / red
    '#00ff9d',   // player 1 — matrix-green
    '#ffcc00',   // player 2 — cyber-gold
    '#05d9e8',   // player 3 — neon-cyan / blue
];

const BLOOM_COLORS = [
    'rgba(255, 0, 122,  0.13)',
    'rgba(0,  255, 157, 0.10)',
    'rgba(255, 204,   0, 0.11)',
    'rgba(  0, 243, 255, 0.13)',
];

const STRIPE_COLORS = [
    'rgba(58, 134, 255, 0.06)',
    'rgba( 0, 243, 255, 0.05)',
    'rgba(255, 0, 122,  0.05)',
    'rgba(58, 134, 255, 0.06)',
];

const ORIGINS = [
    { x: '18%', y: '20%' },
    { x: '82%', y: '20%' },
    { x: '82%', y: '80%' },
    { x: '18%', y: '80%' },
];

/**
 * AmbientLight — framer-motion REMOVED (perf sprint)
 * All transitions are now CSS-only on the compositor thread.
 * background & transform transitions via inline CSS vars + transition property.
 */
export const AmbientLight = ({ activePlayer }) => {
    const idx    = typeof activePlayer === 'number' ? activePlayer : 0;
    const color  = PLAYER_COLORS[idx]  ?? 'transparent';
    const bloom  = BLOOM_COLORS[idx]   ?? 'rgba(0,243,255,0.12)';
    const stripe = STRIPE_COLORS[idx]  ?? 'rgba(58,134,255,0.06)';
    const origin = ORIGINS[idx]        ?? { x: '50%', y: '50%' };

    const TRANSITION = 'background 1.8s cubic-bezier(0.4,0,0.2,1), transform 0.9s cubic-bezier(0.34,1.26,0.64,1)';

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
            {/* ── Wide ambient wash — CSS background transition ── */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    background:
                        `radial-gradient(ellipse 90% 70% at ${origin.x} ${origin.y},` +
                        ` ${bloom} 0%,` +
                        ` ${stripe} 45%,` +
                        ` transparent 75%)`,
                    transition: TRANSITION,
                }}
            />

            {/* ── Tight neon spotlight — CSS transform transition ── */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '70vw',
                    height: '70vw',
                    maxWidth: '600px',
                    maxHeight: '600px',
                    borderRadius: '50%',
                    filter: 'blur(72px)',
                    willChange: 'background, transform',
                    pointerEvents: 'none',
                    background: `radial-gradient(circle, ${color}22 0%, ${color}0d 30%, transparent 65%)`,
                    transform: `translate3d(calc(${origin.x} - 50%), calc(${origin.y} - 50%), 0)`,
                    transition: TRANSITION,
                }}
            />

            {/* ── Hard neon corona — CSS transform transition ── */}
            <div
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
                    background: `radial-gradient(circle, ${color}3c 0%, ${color}16 20%, transparent 50%)`,
                    boxShadow: `0 0 80px 20px ${color}11`,
                    transform: `translate3d(calc(${origin.x} - 50%), calc(${origin.y} - 50%), 0)`,
                    transition: TRANSITION,
                }}
            />
        </div>
    );
};

export default AmbientLight;
