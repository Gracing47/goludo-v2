import React from 'react';
import { motion } from 'framer-motion';
import './Token.css';

function getStackOffset(stackIndex, stackSize) {
    if (stackSize <= 1) return { x: 0, y: 0, scale: 1 };
    const offsets = [
        { x: -20, y: -20 }, { x: 20, y: -20 },
        { x: -20, y: 20 }, { x: 20, y: 20 }
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

    // Calculate percentage position (each cell is 100/15 = 6.667%)
    const cellSize = 100 / 15;
    const baseX = col * cellSize + cellSize / 2; // Center of cell
    const baseY = row * cellSize + cellSize / 2;

    return (
        <motion.div
            initial={false}
            animate={{
                x: `calc(${baseX}% + ${offset.x}%)`,
                y: `calc(${baseY}% + ${offset.y}%)`,
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
                stiffness: 200,
                damping: 20,
                mass: 0.8
            }}
            className={`token token-${color} ${isHighlighted ? 'highlighted' : ''} ${inYard ? 'in-yard' : ''} ${onClick ? 'clickable' : ''}`}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: `${cellSize}%`,
                height: `${cellSize}%`,
                zIndex: isHighlighted ? 100 : isMoving ? 90 : 10 + stackIndex,
                transform: 'translate(-50%, -50%)' // Center on calculated position
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
