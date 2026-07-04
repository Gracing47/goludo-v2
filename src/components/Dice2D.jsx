/**
 * 2D DICE — "FLIP-STRIP" (G-009)
 *
 * Flat compositor-only dice visual for the perf-low tier.
 * Six pre-rendered SVG faces sit side-by-side in a horizontal strip
 * behind an overflow:hidden window. The roll is a steps(6) translateX
 * flicker on the strip (~80ms per face) plus a squash/rotate tumble on
 * the wrapper — 0 paint, 0 layout, 0 filter, 0 preserve-3d.
 *
 * Determinism: the animation NEVER decides the result. `value` comes from
 * rollDice()/the socket event exactly like the 3D dice; it only maps to a
 * static `show-N` class that detents the strip via translateX. Works for
 * fixed local roll duration AND variable web3 socket latency (the flicker
 * is `infinite` and snaps the moment `.rolling` is removed).
 *
 * Strip order is deliberately [1, 4, 2, 6, 3, 5] (high/low alternating)
 * so the flicker reads as random, not as counting up.
 */

import React from 'react';
import './Dice2D.css';

const STRIP_ORDER = [1, 4, 2, 6, 3, 5];

const PIP_XY = {
    tl: [30, 30], tr: [70, 30],
    ml: [30, 50], mr: [70, 50], c: [50, 50],
    bl: [30, 70], br: [70, 70]
};

const PIP_MAP = {
    1: ['c'],
    2: ['tl', 'br'],
    3: ['tl', 'c', 'br'],
    4: ['tl', 'tr', 'bl', 'br'],
    5: ['tl', 'tr', 'c', 'bl', 'br'],
    6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br']
};

/* Flat face: solid fills only — no gradients/filters/IDs, so each face
   rasterises exactly once and is then only composited. */
const Face = ({ n }) => (
    <svg className="dice2d-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <rect className="dice2d-body" x="3" y="3" width="94" height="94" rx="20" />
        <rect className="dice2d-sheen" x="8" y="7" width="84" height="30" rx="14" />
        {PIP_MAP[n].map((k) => (
            <g key={k}>
                <circle className="dice2d-pip" cx={PIP_XY[k][0]} cy={PIP_XY[k][1]} r="9.5" />
                <circle className="dice2d-pip-hi" cx={PIP_XY[k][0] - 3} cy={PIP_XY[k][1] - 3} r="3" />
            </g>
        ))}
    </svg>
);

/* Module constant — renders exactly once, no per-roll React work. */
const FACES = STRIP_ORDER.map((n) => <Face key={n} n={n} />);

const Dice2D = ({ value, isRolling }) => {
    const shown = value > 0 && value <= 6 ? value : 1;

    return (
        <div
            className={`dice2d ${isRolling ? 'rolling' : ''} ${value > 0 ? 'settled' : ''} show-${shown}`}
            aria-hidden="true"
        >
            <div className="dice2d-window">
                <div className="dice2d-strip">{FACES}</div>
            </div>
            {/* Impact ring — pre-baked border+glow, animated via scale/opacity only */}
            <div className="dice2d-ring" />
        </div>
    );
};

export default React.memo(Dice2D);
