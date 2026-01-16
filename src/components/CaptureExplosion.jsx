/**
 * CAPTURE EXPLOSION EFFECT
 * 
 * Renders a CSS particle burst at the specified grid cell.
 * Self-destructs after animation completes.
 */

import React from 'react';
import './CaptureExplosion.css';

const CaptureExplosion = ({ color, row, col }) => {
    return (
        <div
            className={`capture-explosion explosion-${color}`}
            style={{
                gridRow: row + 1,
                gridColumn: col + 1,
            }}
        >
            {/* 8 particle fragments */}
            {[...Array(8)].map((_, i) => (
                <span key={i} className="particle" style={{ '--i': i }} />
            ))}
        </div>
    );
};

export default CaptureExplosion;
