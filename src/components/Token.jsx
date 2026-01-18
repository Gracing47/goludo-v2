import React from 'react';
import { motion } from 'framer-motion';
import './Token.css';

function getStackOffset(stackIndex, stackSize) {
    if (stackSize <= 1) return { x: 0, y: 0, scale: 1 };
    const offsets = [
        { x: -25, y: -25 }, { x: 25, y: -25 },
        { x: -25, y: 25 }, { x: 25, y: 25 }
    ];
    const scale = stackSize === 2 ? 0.75 : 0.6;
    const offset = offsets[stackIndex % 4];
    return { ...offset, scale };
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

    // Calculate position as percentage (each cell is 100/15 = 6.667%)
    const cellPercent = 100 / 15;
    const leftPercent = col * cellPercent + cellPercent / 2 + (offset.x * cellPercent / 100);
    const topPercent = row * cellPercent + cellPercent / 2 + (offset.y * cellPercent / 100);

    return (
        <motion.div
            initial={false}
            animate={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                scale: offset.scale,
                rotate: rotation
            }}
            whileHover={onClick ? {
                scale: offset.scale * 1.25,
                filter: 'brightness(1.3)'
            } : {}}
            whileTap={onClick ? { scale: offset.scale * 0.85 } : {}}
            transition={{
                type: "spring",
                stiffness: 250,
                damping: 22,
                mass: 0.6
            }}
            className={`token token-${color} ${isHighlighted ? 'highlighted' : ''} ${inYard ? 'in-yard' : ''} ${onClick ? 'clickable' : ''}`}
            style={{
                position: 'absolute',
                width: `${cellPercent}%`,
                height: `${cellPercent}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isHighlighted ? 100 : isMoving ? 90 : 10 + stackIndex
            }}
            onClick={onClick}
        >
            <div className="token-inner">
                <div className="token-shine" />
            </div>

            {/* Pulsing highlight ring */}
            {isHighlighted && (
                <motion.div
                    className="token-glow-ring"
                    animate={{
                        opacity: [0.4, 0.8, 0.4],
                        scale: [1, 1.15, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                />
            )}
        </motion.div>
    );
};

export default Token;
