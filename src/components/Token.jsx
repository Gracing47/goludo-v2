import React, { useRef, useEffect, useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import './Token.css';

function getStackOffset(stackIndex, stackSize) {
    if (stackSize <= 1) return { x: 0, y: 0, scale: 1 };
    const offsets = [
        { x: -22, y: -22 }, { x: 22, y: -22 },
        { x: -22, y: 22 }, { x: 22, y: 22 }
    ];
    const scale = stackSize === 2 ? 0.78 : 0.65;
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
    const [showImpact, setShowImpact] = useState(false);

    // Animate when position changes
    useEffect(() => {
        const hasPositionChanged = prevPos.current.row !== row || prevPos.current.col !== col;

        if (hasPositionChanged && !inYard) {
            setIsAnimating(true);

            // Weighted "Heavy" Hop Animation
            controls.start({
                y: [0, -25, 0], // Higher jump
                scale: [1, 1.15, 0.95, 1], // Compression on landing
                rotate: [0, 5, -5, 0], // Subtle mid-air wobble
                transition: {
                    duration: 0.4,
                    times: [0, 0.4, 0.8, 1],
                    ease: "easeOut"
                }
            }).then(() => {
                setIsAnimating(false);
                setShowImpact(true);
                setTimeout(() => setShowImpact(false), 300);
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
        isAnimating && 'animating',
        showImpact && 'impacted'
    ].filter(Boolean).join(' ');

    return (
        <motion.div
            className={classes}
            animate={controls}
            layout
            layoutId={`token-${color}-${stackIndex}`}
            style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                '--stack-x': `${offset.x}%`,
                '--stack-y': `${offset.y}%`,
                '--stack-scale': offset.scale,
                '--rotation': `${rotation}deg`,
                zIndex: isHighlighted ? 100 : isAnimating || showImpact ? 50 : 10 + stackIndex
            }}
            initial={false}
            transition={{
                layout: {
                    type: "spring",
                    stiffness: 400,
                    damping: 30
                }
            }}
            whileHover={onClick ? {
                scale: 1.2,
                rotate: 5,
                boxShadow: "0 0 25px var(--token-glow)"
            } : {}}
            whileTap={onClick ? { scale: 0.85 } : {}}
            onClick={onClick}
        >
            <div className={`token-inner liquid-glass ${color}`}>
                <div className="token-shine" />
                <div className="token-center-dot" />

                {/* Stack Count Badge */}
                {stackSize > 1 && stackIndex === stackSize - 1 && (
                    <div className="token-stack-badge">
                        {stackSize}
                    </div>
                )}

                {/* Landing Shockwave */}
                <AnimatePresence>
                    {showImpact && (
                        <motion.div
                            className="token-impact-wave"
                            initial={{ scale: 0.5, opacity: 1 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        />
                    )}
                </AnimatePresence>
            </div>

            {isHighlighted && (
                <motion.div
                    className="token-glow-aura"
                    animate={{
                        opacity: [0.3, 0.7, 0.3],
                        scale: [1, 1.3, 1],
                        rotate: [0, 180]
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "linear"
                    }}
                />
            )}

            {/* Movement Particles (Simplified) */}
            {isAnimating && (
                <div className="token-trail-particles">
                    {[1, 2, 3].map(i => (
                        <motion.div
                            key={i}
                            className="particle"
                            initial={{ opacity: 0.8, scale: 0.8 }}
                            animate={{ opacity: 0, scale: 0, y: 10 }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default Token;
