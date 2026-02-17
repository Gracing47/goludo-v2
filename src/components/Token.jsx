import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Token.css';

const Token = ({
    playerIndex,
    tokenIndex,
    tokenCount = 1,
    color,
    row,
    col,
    onClick,
    isHighlighted,
    isMoving,
    inYard,
    stackIndex = 0,
    stackSize = 1,
    rotation = 0,
    isBonusMove = false
}) => {
    // Grid-based positioning for stacked tokens (Different Players on same cell)
    const getStackOffset = (index, total) => {
        if (total <= 1) return { x: 0, y: 0, scale: 1, zIndex: 10 };

        if (total === 2) {
            // Side-by-side split — clear separation
            const positions = [
                { x: '-35%', y: '0%' },
                { x: '35%', y: '0%' }
            ];
            return {
                ...positions[index % 2],
                scale: 0.65,
                zIndex: 20 + index
            };
        }

        if (total === 3) {
            // Triangle layout - wider spread
            const positions = [
                { x: '-32%', y: '-26%' },
                { x: '32%', y: '-26%' },
                { x: '0%', y: '32%' }
            ];
            return {
                ...positions[index % 3],
                scale: 0.55,
                zIndex: 20 + index
            };
        }

        // 4 tokens: 2x2 grid - wider spread
        const positions = [
            { x: '-32%', y: '-32%' },
            { x: '32%', y: '-32%' },
            { x: '-32%', y: '32%' },
            { x: '32%', y: '32%' }
        ];
        return {
            ...positions[index % 4],
            scale: 0.5,
            zIndex: 20 + index
        };
    };

    const offset = getStackOffset(stackIndex, stackSize);

    const prevPos = useRef({ row, col });
    const [isAnimating, setIsAnimating] = useState(false);
    const [showImpact, setShowImpact] = useState(false);

    // Animate when position changes — use CSS class for hop
    useEffect(() => {
        const hasPositionChanged = prevPos.current.row !== row || prevPos.current.col !== col;

        if (hasPositionChanged && !inYard) {
            setIsAnimating(true);

            const hopDuration = isBonusMove ? 80 : 120;

            const timer = setTimeout(() => {
                setIsAnimating(false);
                if (!isBonusMove) {
                    setShowImpact(true);
                    setTimeout(() => setShowImpact(false), 250);
                }
            }, hopDuration);

            prevPos.current = { row, col };
            return () => clearTimeout(timer);
        }

        prevPos.current = { row, col };
    }, [row, col, inYard, isBonusMove]);

    // Accessibility: Describe token state for screen readers
    const getAriaLabel = () => {
        const colorName = ['Red', 'Green', 'Yellow', 'Blue'][playerIndex] || color;
        const position = inYard ? 'in starting yard' : `at row ${row + 1}, column ${col + 1}`;
        const status = isHighlighted ? 'selectable' : '';
        const stackInfo = tokenCount > 1 ? `, stacked with ${tokenCount} tokens` : '';

        return `${colorName} token ${tokenIndex + 1} ${position}${stackInfo}${status ? `. ${status}` : ''}`;
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!onClick) return;

        // Enter or Space to select token
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
        }
    };

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
            animate={{
                x: offset.x,
                y: offset.y,
                scale: offset.scale
            }}
            layout
            layoutId={`token-${playerIndex}-${tokenIndex}`}
            style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                '--rotation': `${rotation}deg`,
                zIndex: isHighlighted ? 100 : isAnimating || showImpact ? 50 : offset.zIndex
            }}
            initial={false}
            transition={{
                layout: {
                    type: "spring",
                    stiffness: 400,
                    damping: 30
                },
                x: { type: "spring", stiffness: 300, damping: 25 },
                y: { type: "spring", stiffness: 300, damping: 25 },
                scale: { type: "spring", stiffness: 300, damping: 25 }
            }}
            whileHover={onClick ? {
                scale: offset.scale * 1.25,
                zIndex: 200,
                transition: { type: "spring", stiffness: 300 }
            } : {}}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            // Accessibility attributes
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : -1}
            aria-label={getAriaLabel()}
            aria-pressed={isHighlighted}
            aria-disabled={!onClick}
        >
            <div className={`token-inner liquid-glass ${color}`}>
                <div className="token-shine" aria-hidden="true" />
                <div className="token-center-dot" aria-hidden="true" />

                {/* 🔢 Stack Count Badge (counter-rotated to stay readable) */}
                {tokenCount > 1 && (
                    <div
                        className="token-stack-badge"
                        style={{ transform: `translate(-50%, -50%) rotate(calc(-1 * var(--rotation, 0deg)))` }}
                        aria-label={`${tokenCount} tokens stacked`}
                    >
                        {tokenCount}
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
                            aria-hidden="true"
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
                    aria-hidden="true"
                />
            )}

            {/* Movement Particles (Simplified) */}
            {isAnimating && (
                <div className="token-trail-particles" aria-hidden="true">
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

            {/* Screen reader announcement for movement */}
            {isAnimating && !isBonusMove && (
                <span className="sr-only" aria-live="polite">
                    Token moving
                </span>
            )}
        </motion.div>
    );
};

export default React.memo(Token);
