import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    'red': '#ff4d4d',
    'green': '#00ff88',
    'yellow': '#ffcc00',
    'blue': '#3399ff',
    'cyan': '#00f3ff'
};

const getHex = (color: string) => COLOR_MAP[color] || color;

const AAACountdown: React.FC<AAACountdownProps> = ({ countdown, players }) => {
    return (
        <div className="aaa-countdown-overlay">
            <motion.div
                className="aaa-countdown-card"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -20 }}
                transition={{ duration: 0.4, ease: "circOut" }}
            >
                {/* Multi-color glow from all players */}
                <div className="aaa-countdown-glow-ring">
                    {players.map((p, i) => (
                        <div
                            key={i}
                            className="aaa-glow-segment"
                            style={{
                                backgroundColor: getHex(p.color),
                                transform: `rotate(${i * (360 / players.length)}deg) translateY(-60px)`,
                            }}
                        />
                    ))}
                </div>

                <div className="aaa-countdown-content">
                    <motion.h3
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        GET READY
                    </motion.h3>

                    {/* Player roster */}
                    <div className="aaa-player-roster">
                        {players.map((p, i) => (
                            <motion.div
                                key={i}
                                className="aaa-player-chip"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                style={{
                                    '--chip-color': getHex(p.color),
                                } as React.CSSProperties}
                            >
                                <span className="aaa-chip-dot" />
                                <span className="aaa-chip-name">{p.name}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Timer ring */}
                    <div className="aaa-countdown-timer-wrapper">
                        <svg className="aaa-countdown-svg" viewBox="0 0 100 100">
                            <circle className="aaa-timer-track" cx="50" cy="50" r="45" />
                            <motion.circle
                                className="aaa-timer-progress"
                                cx="50" cy="50" r="45"
                                initial={{ pathLength: 1 }}
                                animate={{ pathLength: countdown / 5 }}
                                transition={{ duration: 1, ease: "linear" }}
                            />
                        </svg>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={countdown}
                                className="aaa-countdown-number"
                                initial={{ scale: 0.5, opacity: 0, rotateX: 90 }}
                                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                                exit={{ scale: 1.5, opacity: 0, rotateX: -90 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            >
                                {countdown > 0 ? countdown : "GO!"}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        transition={{ delay: 0.3 }}
                    >
                        {countdown > 0 ? "Preparing the board..." : "Good luck!"}
                    </motion.p>
                </div>
            </motion.div>
        </div>
    );
};

export default AAACountdown;
