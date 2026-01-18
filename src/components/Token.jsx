import React from 'react';
import { motion } from 'framer-motion';
import './Token.css';

function getStackOffset(stackIndex, stackSize) {
    if (stackSize <= 1) return { x: 0, y: 0, scale: 1 };
    const offsets = [
        { x: -20, y: -20 }, { x: 20, y: -20 },
        { x: -20, y: 20 }, { x: 20, y: 20 }
    ];
    const scale = stackSize === 2 ? 0.8 : 0.65;
    return { ...offsets[stackIndex % 4], scale };
}

const Token = ({
    color,
    row,
    col,
    onClick,
    isHighlighted,
    isMoving,
    inYard,
    stackIndex = 0,
    stackSize = 1,
    rotation = 0
}) => {
    const offset = getStackOffset(stackIndex, stackSize);

    // Use CSS Grid for positioning + CSS transition for smooth movement
    // Framer Motion handles only hover/tap/highlight effects
    return (
        <motion.div
            className={`token token-${color} ${isHighlighted ? 'highlighted' : ''} ${isMoving ? 'moving' : ''} ${inYard ? 'in-yard' : ''} ${onClick ? 'clickable' : ''} ${stackSize > 1 ? 'stacked' : ''}`}
            style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                '--stack-x': `${offset.x}%`,
                '--stack-y': `${offset.y}%`,
                '--stack-scale': offset.scale,
                '--rotation': `${rotation}deg`,
                zIndex: isHighlighted ? 100 : isMoving ? 200 : 10 + stackIndex
            }}
            whileHover={onClick ? { scale: 1.15, filter: 'brightness(1.2)' } : {}}
            whileTap={onClick ? { scale: 0.9 } : {}}
            onClick={onClick}
        >
            <div className="token-inner">
                <div className="token-shine" />
            </div>

            {/* Pulsing highlight for valid moves */}
            {isHighlighted && (
                <motion.div
                    className="token-glow-ring"
                    animate={{
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.12, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                />
            )}

            {/* Landing ripple effect */}
            {isMoving && (
                <div className="token-landing-ripple" />
            )}
        </motion.div>
    );
};

export default Token;
