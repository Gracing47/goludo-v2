import React, { useRef, useEffect, useState } from 'react';
import './Token.css';

/**
 * TOKEN — framer-motion REMOVED (perf sprint)
 * All animations are now CSS-only (GPU compositor thread).
 * Stack offsets via inline CSS vars → CSS transform.
 * Impact wave → CSS keyframe animation class toggle.
 * Trail particles → CSS keyframe classes.
 * Spring hover → CSS :hover + transition.
 */

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
    isBonusMove = false,
    onHoverChange,
    isAnyTokenMoving = false,
    allTokenIndices = [tokenIndex]
}) => {
    // Grid-based positioning for stacked tokens (Different Players on same cell)
    const getStackOffset = (index, total) => {
        if (total <= 1) return { x: 0, y: 0, scale: 1, zIndex: 10 };

        if (total === 2) {
            const positions = [
                { x: '-38%', y: '0%' },
                { x: '38%', y: '0%' }
            ];
            return { ...positions[index % 2], scale: 0.58, zIndex: 20 + index };
        }

        if (total === 3) {
            const positions = [
                { x: '-36%', y: '-30%' },
                { x: '36%', y: '-30%' },
                { x: '0%', y: '36%' }
            ];
            return { ...positions[index % 3], scale: 0.5, zIndex: 20 + index };
        }

        const positions = [
            { x: '-38%', y: '-38%' },
            { x: '38%', y: '-38%' },
            { x: '-38%', y: '38%' },
            { x: '38%', y: '38%' }
        ];
        return { ...positions[index % 4], scale: 0.45, zIndex: 20 + index };
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
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(playerIndex, tokenIndex, allTokenIndices);
        }
    };

    // Telegraphing: notify parent when hover/focus state changes
    const handleMouseEnter = () => { onHoverChange?.(playerIndex, tokenIndex, true); };
    const handleMouseLeave = () => { onHoverChange?.(playerIndex, tokenIndex, false); };
    const handleFocus      = () => { onHoverChange?.(playerIndex, tokenIndex, true); };
    const handleBlur       = () => { onHoverChange?.(playerIndex, tokenIndex, false); };

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
        <div
            className={classes}
            style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                '--rotation': `${rotation}deg`,
                '--token-x': offset.x,
                '--token-y': offset.y,
                '--token-scale': offset.scale,
                zIndex: isHighlighted ? 100 : isAnimating || showImpact ? 50 : offset.zIndex,
                transform: `translate(var(--token-x, 0), var(--token-y, 0)) scale(var(--token-scale, 1))`,
                transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={onClick ? () => onClick(playerIndex, tokenIndex, allTokenIndices) : undefined}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : -1}
            aria-label={getAriaLabel()}
            aria-pressed={isHighlighted}
            aria-disabled={!onClick}
        >
            <div className={`token-inner ${color}`}>
                <div className="token-shine" aria-hidden="true" />
                <div className="token-center-dot" aria-hidden="true" />

                {/* 🔢 Stack Count Badge — counter-rotated to stay upright (B2 fix) */}
                {tokenCount > 1 && (
                    <div
                        className="token-stack-badge"
                        style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
                        aria-label={`${tokenCount} tokens stacked`}
                    >
                        ×{tokenCount}
                    </div>
                )}

                {/* Landing Shockwave — CSS keyframe, no framer-motion */}
                {showImpact && (
                    <div className="token-impact-wave" aria-hidden="true" />
                )}
            </div>

            {/* glow aura — animated via CSS (GPU), not JS-thread */}
            {isHighlighted && (
                <div className="token-glow-aura" aria-hidden="true" />
            )}

            {/* Movement Particles — CSS keyframe classes */}
            {isAnimating && (
                <div className="token-trail-particles" aria-hidden="true">
                    <div className="particle particle-1" />
                    <div className="particle particle-2" />
                    <div className="particle particle-3" />
                </div>
            )}

            {/* Screen reader announcement for movement */}
            {isAnimating && !isBonusMove && (
                <span className="sr-only" aria-live="polite">
                    Token moving
                </span>
            )}
        </div>
    );
};

export default React.memo(Token);
