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

    // Grid is 15x15, calculate center of each cell
    const cellSize = 100 / 15; // ~6.667%

    // Position at center of cell, then apply stack offset
    const xPos = col * cellSize + (offset.x * cellSize / 100);
    const yPos = row * cellSize + (offset.y * cellSize / 100);

    return (
        <motion.div
            animate={{
                x: `${xPos}%`,
                y: `${yPos}%`,
                scale: offset.scale,
                rotate: rotation
            }}
            whileHover={onClick ? {
                scale: offset.scale * 1.2,
                filter: 'brightness(1.25)'
            } : {}}
            whileTap={onClick ? { scale: offset.scale * 0.9 } : {}}
            transition={{
                type: "spring",
                stiffness: 280,
                damping: 24
            }}
            className={`token token-${color} ${isHighlighted ? 'highlighted' : ''} ${inYard ? 'in-yard' : ''} ${onClick ? 'clickable' : ''}`}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: `${cellSize}%`,
                height: `${cellSize}%`,
                zIndex: isHighlighted ? 100 : isMoving ? 90 : 10 + stackIndex
            }}
            onClick={onClick}
        >
            <div className="token-inner">
                <div className="token-shine" />
            </div>

            {isHighlighted && (
                <motion.div
                    className="token-glow-ring"
                    animate={{
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                />
            )}
        </motion.div>
    );
};

export default Token;
