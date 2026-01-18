import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Token.css';

function getStackOffset(stackIndex, stackSize) {
    if (stackSize <= 1) return { x: 0, y: 0, scale: 1 };
    const offsets = [
        { x: -15, y: -15 }, { x: 15, y: -15 },
        { x: -15, y: 15 }, { x: 15, y: 15 }
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

    return (
        <motion.div
            layout // Magic: Handles smooth transition between grid positions
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: 1,
                opacity: 1,
                // Apply stacking transforms
                x: `${offset.x}%`,
                y: `${offset.y}%`,
                scale: offset.scale,
                rotate: rotation
            }}
            whileHover={onClick ? {
                scale: offset.scale * 1.2,
                y: '-8%',
                filter: 'brightness(1.2)'
            } : {}}
            whileTap={onClick ? { scale: offset.scale * 0.9 } : {}}
            transition={{
                layout: { type: "spring", stiffness: 300, damping: 25 },
                scale: { duration: 0.2 }
            }}
            className={`token token-${color} ${isHighlighted ? 'highlighted' : ''} ${inYard ? 'in-yard' : ''} ${onClick ? 'clickable' : ''}`}
            style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                zIndex: isHighlighted || isMoving ? 100 : 10 + stackIndex,
                position: 'relative'
            }}
            onClick={onClick}
        >
            <div className="token-shine" />

            {/* Active Glow Overlay */}
            {isHighlighted && (
                <motion.div
                    className="token-glow-ring"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                />
            )}
        </motion.div>
    );
};

export default Token;

export default Token;
