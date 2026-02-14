import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AAACountdown.css';

interface AAACountdownProps {
    countdown: number;
    playerName?: string;
    playerColor?: string;
}

/**
 * AAACountdown - Premium Uniswap/PancakeSwap style countdown
 * Features glassmorphism, neon glows, and smooth motion.
 */
const AAACountdown: React.FC<AAACountdownProps> = ({
    countdown,
    playerName,
    playerColor = '#00f3ff'
}) => {
    // Map player color name to actual hex/rgb if needed
    const getColorValue = (color: string) => {
        const map: Record<string, string> = {
            'red': '#ff4d4d',
            'green': '#00ff88',
            'yellow': '#ffcc00',
            'blue': '#3399ff',
            'cyan': '#00f3ff'
        };
        return map[color] || color;
    };

    const activeColor = getColorValue(playerColor);

    return (
        <div className="aaa-countdown-overlay">
            <motion.div
                className="aaa-countdown-card"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -20 }}
                transition={{ duration: 0.4, ease: "circOut" }}
            >
                {/* Neon Glow Backdrop */}
                <div className="aaa-countdown-glow" style={{ backgroundColor: activeColor }} />

                <div className="aaa-countdown-content">
                    <motion.h3
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {playerName ? (
                            <>Ready, <span style={{ color: activeColor }}>{playerName}</span>?</>
                        ) : (
                            "GET READY"
                        )}
                    </motion.h3>

                    <div className="aaa-countdown-timer-wrapper">
                        <svg className="aaa-countdown-svg" viewBox="0 0 100 100">
                            <circle className="aaa-timer-track" cx="50" cy="50" r="45" />
                            <motion.circle
                                className="aaa-timer-progress"
                                cx="50" cy="50" r="45"
                                style={{ stroke: activeColor }}
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
                                style={{ color: countdown === 0 ? activeColor : '#fff' }}
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
