import React, { useRef, useEffect, useState } from 'react';
import './Token.css';

/**
 * TOKEN — transform-only movement (G-009)
 *
 * The token no longer sits in a grid cell (gridRow/gridColumn): every cell
 * change used to be a LAYOUT mutation that reflowed the whole 15×15 grid
 * (225 cells + pseudos) per hop. Instead, each token now lives in a
 * `.token-slot` wrapper that is absolutely positioned once and moved via
 * `transform: translate(...)` driven by the --gr/--gc CSS vars — a pure
 * compositor operation, zero reflow, on ALL tiers.
 *
 * The slot carries position + stack offset + stack scale; the inner .token
 * keeps all its existing animations (bounce, hop, press, hover) which now
 * compose cleanly relative to the slot.
 *
 * Hop squash & trail particles are driven by the `isMoving` prop (set once
 * per move by App/executeMove or the socket sync) instead of a per-hop
 * setState machine — this removes 4 extra React renders per hop. The
 * landing impact fires once when the move completes (isMoving true→false).
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
        if (total <= 1) return { x: '0%', y: '0%', scale: 1, zIndex: 10 };

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

    // Landing impact — fires ONCE when the move completes (isMoving true→false),
    // not per hop. 2 renders per MOVE instead of 4 per hop.
    const wasMovingRef = useRef(false);
    const [showImpact, setShowImpact] = useState(false);

    useEffect(() => {
        if (wasMovingRef.current && !isMoving && !inYard) {
            wasMovingRef.current = false;
            setShowImpact(true);
            const timer = setTimeout(() => setShowImpact(false), 300);
            return () => clearTimeout(timer);
        }
        wasMovingRef.current = isMoving;
    }, [isMoving, inYard]);

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
        isMoving && 'moving',
        showImpact && 'impacted'
    ].filter(Boolean).join(' ');

    return (
        <div
            className={`token-slot${isBonusMove ? ' bonus-hop' : ''}`}
            style={{
                // Position via CSS vars → transform in Token.css. Changing these
                // only retargets a compositor transition — no grid reflow.
                '--gr': row,
                '--gc': col,
                '--token-x': offset.x,
                '--token-y': offset.y,
                '--token-scale': offset.scale,
                zIndex: isHighlighted ? 100 : isMoving || showImpact ? 50 : offset.zIndex,
            }}
        >
            <div
                className={classes}
                style={{ '--rotation': `${rotation}deg` }}
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

                    {/* Landing Shockwave — CSS keyframe, fires once per move */}
                    {showImpact && (
                        <div className="token-impact-wave" aria-hidden="true" />
                    )}
                </div>

                {/* glow aura — animated via CSS (GPU), not JS-thread */}
                {isHighlighted && (
                    <div className="token-glow-aura" aria-hidden="true" />
                )}

                {/* Movement Particles — mounted once per move (not per hop);
                    hidden entirely on perf-low (see perf-low.css) */}
                {isMoving && !inYard && (
                    <div className="token-trail-particles" aria-hidden="true">
                        <div className="particle particle-1" />
                        <div className="particle particle-2" />
                        <div className="particle particle-3" />
                    </div>
                )}

                {/* Screen reader announcement for movement */}
                {isMoving && !isBonusMove && (
                    <span className="sr-only" aria-live="polite">
                        Token moving
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * Custom memo comparator (G-009): `allTokenIndices` is rebuilt as a fresh
 * array on every gameState change, which used to defeat React.memo and
 * re-render all 16 tokens on every 150ms hop. Compare it by value; every
 * other prop is a primitive or a stable callback.
 */
function tokenPropsEqual(prevProps, nextProps) {
    for (const key in nextProps) {
        if (key === 'allTokenIndices') continue;
        if (prevProps[key] !== nextProps[key]) return false;
    }
    const a = prevProps.allTokenIndices;
    const b = nextProps.allTokenIndices;
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export default React.memo(Token, tokenPropsEqual);
