/**
 * ANIMATED DICE COMPONENT — tier-switched (G-009)
 *
 * high tier → physically accurate 3D cube (CSS 3D transforms, unchanged).
 * low tier  → flat "Flip-Strip" 2D dice (Dice2D) whose roll runs entirely
 *             on the compositor: no preserve-3d, no per-face filter flash,
 *             no blend layers. Same button shell, overlays, ARIA and props.
 *
 * The switch reacts to BOTH the static tier (usePerfTier) and a runtime
 * perf-low latch by the FPS watchdog (html.perf-low added mid-session):
 * a MutationObserver on <html> promotes the dice to the 2D path as soon
 * as the watchdog escalates — no reload needed.
 */

import React, { useEffect, useState } from 'react';
import './Dice.css';
import Dice2D from './Dice2D';
import { usePerfTier } from '../hooks/usePerfTier';

/** true once html.perf-low is active — statically or via watchdog latch */
function useIsPerfLow() {
    const perfTier = usePerfTier();
    const [runtimeLow, setRuntimeLow] = useState(
        () => typeof document !== 'undefined' && document.documentElement.classList.contains('perf-low')
    );

    useEffect(() => {
        if (perfTier === 'low' || runtimeLow) return; // already low — nothing to observe
        if (typeof document === 'undefined') return;
        const el = document.documentElement;
        if (el.classList.contains('perf-low')) {
            setRuntimeLow(true);
            return;
        }
        const observer = new MutationObserver(() => {
            if (el.classList.contains('perf-low')) {
                setRuntimeLow(true);
                observer.disconnect();
            }
        });
        observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [perfTier, runtimeLow]);

    return perfTier === 'low' || runtimeLow;
}

const Dice = ({ value, onRoll, disabled, isRolling, color = '#ff007a' }) => {
    const isPerfLow = useIsPerfLow();

    // Determine current game state for screen readers
    const getAriaLabel = () => {
        if (disabled) {
            return "Dice - Not your turn";
        }
        if (isRolling) {
            return "Dice is rolling";
        }
        if (value > 0) {
            return `Dice showing ${value}. Press Enter or Space to roll again`;
        }
        return "Roll dice. Press Enter or Space";
    };

    // Roll trigger with subtle haptic tick on mobile (G-009 extra)
    const handleRoll = () => {
        if (disabled || isRolling) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(8); // one short, subtle tick — the "grab" of the dice
        }
        onRoll?.();
    };

    // Handle keyboard events
    const handleKeyDown = (e) => {
        if (disabled || isRolling) return;

        // Enter or Space to roll
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // Prevent page scroll on Space
            handleRoll();
        }
    };

    const isReady = !disabled && !isRolling;

    return (
        <button
            className={`dice-button ${disabled ? 'disabled' : ''} ${isRolling ? 'rolling-container' : ''} ${isReady ? 'ready' : ''}`}
            onClick={handleRoll}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label={getAriaLabel()}
            aria-disabled={disabled}
            aria-busy={isRolling}
            aria-live="polite"
            role="button"
            tabIndex={disabled ? -1 : 0}
            style={{ '--dice-color': color }}
        >
            {isPerfLow ? (
                /* perf-low: compositor-only 2D flip-strip dice */
                <Dice2D value={value} isRolling={isRolling} />
            ) : (
                /* high tier: full 3D cube — unchanged */
                <div className={`dice ${isRolling ? 'rolling' : ''} show-${(value > 0 && value <= 6) ? value : 1}`}>
                    {/* Standard faces */}
                    <div className="dice-face face-1" aria-hidden="true"><span className="dot"></span></div>
                    <div className="dice-face face-2" aria-hidden="true"><span className="dot"></span><span className="dot"></span></div>
                    <div className="dice-face face-3" aria-hidden="true"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                    <div className="dice-face face-4" aria-hidden="true"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                    <div className="dice-face face-5" aria-hidden="true"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                    <div className="dice-face face-6" aria-hidden="true"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                </div>
            )}

            {/* Rolled value overlay — shows numeric result on the button face after roll (B1 fix) */}
            {value > 0 && value <= 6 && !isRolling && (
                <div className="dice-result-overlay" aria-hidden="true">
                    <span className="dice-result-number">{value}</span>
                    {value === 6 && <span className="dice-roll-again-cue">ROLL AGAIN</span>}
                </div>
            )}

            {/* Bonus value overlay */}
            {value > 6 && !isRolling && (
                <div className="dice-bonus-overlay" aria-label={`Bonus move: ${value} steps`}>
                    +{value}
                </div>
            )}

            {/* Screen reader announcement for current value */}
            {value > 0 && !isRolling && (
                <span className="sr-only" aria-live="assertive">
                    Rolled {value > 6 ? `${value} (bonus move)` : value}
                </span>
            )}

            {/* Tap-to-roll affordance — beckons the player when it's their roll */}
            {isReady && <span className="dice-hint" aria-hidden="true">TAP TO ROLL</span>}
        </button>
    );
};

export default React.memo(Dice);
