import React from 'react';
import './AAACountdown.css';

/**
 * AAACountdown — framer-motion REMOVED (perf sprint)
 * All enter/exit animations now use CSS keyframes.
 * The countdown number flip uses a CSS animation class toggled per key.
 */

interface Player {
    name: string;
    color: string;
}

interface AAACountdownProps {
    countdown: number;
    players: Player[];
}

const COLOR_MAP: Record<string, string> = {
    'red':    '#ff4757',
    'green':  '#00d26a',
    'yellow': '#ffbe0b',
    'blue':   '#3a86ff',
    'cyan':   '#00f3ff'
};

const getHex = (color: string) => COLOR_MAP[color] || color;

const AAACountdown: React.FC<AAACountdownProps> = ({ countdown, players }) => {
    const isGo = countdown <= 0;

    return (
        <div className="aaa-countdown-overlay">
            {/* Ambient bloom blobs from player colors — behind card */}
            <div className="aaa-ambient-blooms" aria-hidden="true">
                {players.map((p, i) => (
                    <div
                        key={i}
                        className="aaa-bloom-blob"
                        style={{
                            '--blob-color': getHex(p.color),
                            '--blob-angle': `${i * (360 / players.length)}deg`,
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            {/* Card — CSS fade-in-up (replaces framer-motion initial/animate/exit) */}
            <div className="aaa-countdown-card aaa-card-enter">
                {/* Top-edge light */}
                <div className="aaa-card-edge-light" aria-hidden="true" />

                <div className="aaa-countdown-content">
                    {/* Pre-title label — CSS stagger delay */}
                    <div className="aaa-pretitle aaa-stagger-1">
                        GET READY
                    </div>

                    {/* Player roster chips — CSS stagger per chip */}
                    <div className="aaa-player-roster">
                        {players.map((p, i) => (
                            <div
                                key={i}
                                className="aaa-player-chip aaa-chip-enter"
                                style={{
                                    '--chip-color': getHex(p.color),
                                    animationDelay: `${0.3 + i * 0.1}s`,
                                } as React.CSSProperties}
                            >
                                <span className="aaa-chip-dot" />
                                <span className="aaa-chip-name">{p.name}</span>
                            </div>
                        ))}
                    </div>

                    {/* Big countdown ring */}
                    <div className="aaa-countdown-timer-wrapper">
                        <svg className="aaa-countdown-svg" viewBox="0 0 100 100" aria-hidden="true">
                            <circle className="aaa-timer-track" cx="50" cy="50" r="44" />
                            {/* CSS stroke-dashoffset transition replaces motion.circle pathLength */}
                            <circle
                                className="aaa-timer-progress"
                                cx="50" cy="50" r="44"
                                style={{
                                    strokeDasharray: '276.46',
                                    strokeDashoffset: `${276.46 * (1 - (isGo ? 0 : countdown / 5))}`,
                                    transition: `stroke-dashoffset ${isGo ? 0.3 : 1}s linear`,
                                }}
                            />
                        </svg>

                        <svg className="aaa-countdown-svg aaa-countdown-svg-inner" viewBox="0 0 100 100" aria-hidden="true">
                            <circle
                                className="aaa-timer-progress-inner"
                                cx="50" cy="50" r="38"
                                style={{
                                    strokeDasharray: '238.76',
                                    strokeDashoffset: `${238.76 * (1 - (isGo ? 0 : countdown / 5))}`,
                                    transition: `stroke-dashoffset ${isGo ? 0.3 : 1}s linear 0.05s`,
                                }}
                            />
                        </svg>

                        {/* Number flip — CSS keyframe keyed by countdown value */}
                        <div
                            key={countdown}
                            className={`aaa-countdown-number aaa-number-flip${isGo ? ' aaa-countdown-go' : ''}`}
                        >
                            {isGo ? 'GO!' : countdown}
                        </div>
                    </div>

                    {/* Sub-label */}
                    <p
                        key={isGo ? 'go' : 'wait'}
                        className="aaa-countdown-sublabel aaa-stagger-2"
                    >
                        {isGo ? 'Good luck!' : 'Preparing the board…'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AAACountdown;
