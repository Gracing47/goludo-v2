import React from 'react';
import { motion, AnimatePresence, type MotionStyle } from 'framer-motion';
import './AAACountdown.css';

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

            <motion.div
                className="aaa-countdown-card"
                initial={{ opacity: 0, scale: 0.88, y: 28 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.06, y: -24 }}
                transition={{
                    duration: 0.5,
                    ease: [0.175, 0.885, 0.32, 1.275] /* ease-spring */
                }}
            >
                {/* Top-edge light */}
                <div className="aaa-card-edge-light" aria-hidden="true" />

                <div className="aaa-countdown-content">
                    {/* Pre-title label */}
                    <motion.div
                        className="aaa-pretitle"
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                    >
                        GET READY
                    </motion.div>

                    {/* Player roster chips */}
                    <div className="aaa-player-roster">
                        {players.map((p, i) => (
                            <motion.div
                                key={i}
                                className="aaa-player-chip"
                                initial={{ opacity: 0, x: -18, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{
                                    delay: 0.3 + i * 0.1,
                                    type: 'spring',
                                    stiffness: 380,
                                    damping: 20
                                }}
                                style={{
                                    '--chip-color': getHex(p.color),
                                } as MotionStyle}
                            >
                                <span className="aaa-chip-dot" />
                                <span className="aaa-chip-name">{p.name}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Big countdown ring */}
                    <div className="aaa-countdown-timer-wrapper">
                        {/* Outer glow ring — static track */}
                        <svg className="aaa-countdown-svg" viewBox="0 0 100 100" aria-hidden="true">
                            <circle className="aaa-timer-track" cx="50" cy="50" r="44" />
                            <motion.circle
                                className="aaa-timer-progress"
                                cx="50" cy="50" r="44"
                                initial={{ pathLength: 1 }}
                                animate={{ pathLength: isGo ? 0 : countdown / 5 }}
                                transition={{ duration: isGo ? 0.3 : 1, ease: 'linear' }}
                            />
                        </svg>

                        {/* Inner glow ring accent */}
                        <svg className="aaa-countdown-svg aaa-countdown-svg-inner" viewBox="0 0 100 100" aria-hidden="true">
                            <motion.circle
                                className="aaa-timer-progress-inner"
                                cx="50" cy="50" r="38"
                                initial={{ pathLength: 1 }}
                                animate={{ pathLength: isGo ? 0 : countdown / 5 }}
                                transition={{ duration: isGo ? 0.3 : 1, ease: 'linear', delay: 0.05 }}
                            />
                        </svg>

                        {/* The number / GO text */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={countdown}
                                className={`aaa-countdown-number${isGo ? ' aaa-countdown-go' : ''}`}
                                initial={{ scale: 0.4, opacity: 0, rotateX: 80 }}
                                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                                exit={{ scale: 1.6, opacity: 0, rotateX: -60 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 18
                                }}
                            >
                                {isGo ? 'GO!' : countdown}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Sub-label */}
                    <motion.p
                        className="aaa-countdown-sublabel"
                        key={isGo ? 'go' : 'wait'}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        {isGo ? 'Good luck!' : 'Preparing the board…'}
                    </motion.p>
                </div>
            </motion.div>
        </div>
    );
};

export default AAACountdown;
