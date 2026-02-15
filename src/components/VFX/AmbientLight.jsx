import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PLAYER_COLORS = ['#ff4757', '#00d26a', '#ffbe0b', '#3a86ff'];

// Positioning for the 4 corners/sides
const POSITIONS = [
    { top: '20%', left: '20%' }, // Red (Top Left)
    { top: '20%', right: '20%' }, // Green (Top Right)
    { bottom: '20%', right: '20%' }, // Yellow (Bottom Right)
    { bottom: '20%', left: '20%' }  // Blue (Bottom Left)
];

export const AmbientLight = ({ activePlayer }) => {
    // If no active player (e.g. game over), default to index 0 or hide
    const color = PLAYER_COLORS[activePlayer] || 'transparent';
    const pos = POSITIONS[activePlayer] || { top: '50%', left: '50%' };

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 0 // Behind everything
            }}
        >
            <motion.div
                animate={{
                    background: `radial-gradient(circle at ${pos.left ? '25%' : '75%'} ${pos.top ? '25%' : '75%'}, ${color}15 0%, transparent 70%)`
                }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%'
                }}
            />

            {/* Moving Spotlight */}
            <motion.div
                className="spotlight"
                initial={false}
                animate={{
                    top: pos.top || 'auto',
                    bottom: pos.bottom || 'auto',
                    left: pos.left || 'auto',
                    right: pos.right || 'auto',
                    background: `radial-gradient(circle, ${color}33 0%, transparent 60%)`
                }}
                transition={{
                    type: "spring",
                    stiffness: 50,
                    damping: 20
                }}
                style={{
                    position: 'absolute',
                    width: '60vw',
                    height: '60vw',
                    borderRadius: '50%',
                    filter: 'blur(60px)',
                    transform: 'translate(-50%, -50%)', // Center on coords? No, using CSS positioning props directly
                }}
            />
        </div>
    );
};

export default AmbientLight;
