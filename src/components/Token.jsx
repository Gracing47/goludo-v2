import React, { useRef, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
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
    const controls = useAnimation();
    const prevPos = useRef({ row, col });
    const [isAnimating, setIsAnimating] = useState(false);

    // Animate when position changes
    useEffect(() => {
        const hasPositionChanged = prevPos.current.row !== row || prevPos.current.col !== col;

        if (hasPositionChanged && !inYard) {
            // Calculate movement delta in grid units
            const deltaRow = row - prevPos.current.row;
            const deltaCol = col - prevPos.current.col;

            setIsAnimating(true);

            // Hop animation sequence - start from old position
            controls.start({
                y: [0, -20, 0], // Hop up then down
                scale: [1, 1.1, 1], // Slight scale during hop
                transition: {
                    duration: 0.35,
                    ease: [0.34, 1.56, 0.64, 1], // Spring-like bounce
                    times: [0, 0.5, 1]
                }
            }).then(() => {
                setIsAnimating(false);
            });
        }

        prevPos.current = { row, col };
    }, [row, col, inYard, controls]);

    const classes = [
        'token',
        `token-${color}`,
        isHighlighted && 'highlighted',
        inYard && 'in-yard',
        onClick && 'clickable',
        stackSize > 1 && 'stacked',
        isAnimating && 'animating'
    ].filter(Boolean).join(' ');

    return (
        <motion.div
            className={classes}
            animate={controls}
            layout // Enable layout animation for smooth grid transitions
            layoutId={`token-${color}-${stackIndex}`} // Unique ID for layout animation
            style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                '--stack-x': `${offset.x}%`,
                '--stack-y': `${offset.y}%`,
                '--stack-scale': offset.scale,
                '--rotation': `${rotation}deg`,
                zIndex: isHighlighted ? 100 : isAnimating ? 50 : 10 + stackIndex
            }}
            initial={false}
            transition={{
                layout: {
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    duration: 0.4
                }
            }}
            whileHover={onClick ? { scale: 1.15, filter: 'brightness(1.2)' } : {}}
            whileTap={onClick ? { scale: 0.9 } : {}}
            onClick={onClick}
        >
            <div className="token-inner">
                <div className="token-shine" />
                {/* Landing ripple effect */}
                {isAnimating && <div className="token-landing-ripple" />}
            </div>

            {isHighlighted && (
                <motion.div
                    className="token-glow-ring"
                    animate={{
                        opacity: [0.4, 1, 0.4],
                        scale: [0.95, 1.15, 0.95]
                    }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                />
            )}

            {/* Movement trail effect */}
            {isAnimating && (
                <motion.div
                    className="token-trail"
                    initial={{ opacity: 0.6, scale: 1 }}
                    animate={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3 }}
                />
            )}
        </motion.div>
    );
};

export default Token;
