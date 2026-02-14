import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GameCountdown.css';

interface GameCountdownProps {
    countdown: number;
    playerName?: string;
    playerColor?: string;
    onComplete?: () => void;
}

const GameCountdown: React.FC<GameCountdownProps> = ({
    countdown,
    playerName,
    playerColor = 'cyan',
    onComplete
}) => {
    const [displayNumber, setDisplayNumber] = useState(countdown);

    useEffect(() => {
        setDisplayNumber(countdown);
        if (countdown === 0 && onComplete) {
            onComplete();
        }
    }, [countdown, onComplete]);

    const getCountdownText = () => {
        if (displayNumber <= 0) return "GO!";
        return displayNumber.toString();
    };

    const getColorVar = () => {
        const colorMap: Record<string, string> = {
            'red': 'var(--color-red, #ef4444)',
            'green': 'var(--color-green, #22c55e)',
            'yellow': 'var(--color-yellow, #eab308)',
            'blue': 'var(--color-blue, #3b82f6)',
            'cyan': '#00f3ff'
        };
        return colorMap[playerColor] || colorMap.cyan;
    };

    return (
        <div className="countdown-overlay">
            <motion.div
                className="countdown-content"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <motion.div
                    className="countdown-title"
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    {playerName ? (
                        <>Playing as <span style={{ color: getColorVar() }}>{playerName}</span></>
                    ) : (
                        "Get Ready!"
                    )}
                </motion.div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={displayNumber}
                        className="countdown-number"
                        style={{
                            color: displayNumber <= 0 ? getColorVar() : 'white',
                            textShadow: `0 0 40px ${getColorVar()}`
                        }}
                        initial={{ scale: 0.3, opacity: 0, rotateX: -90 }}
                        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                        exit={{ scale: 1.5, opacity: 0, rotateX: 90 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20
                        }}
                    >
                        {getCountdownText()}
                    </motion.div>
                </AnimatePresence>

                <motion.div
                    className="countdown-subtitle"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 0.7 }}
                    transition={{ delay: 0.2 }}
                >
                    {displayNumber > 0 ? "Preparing battlefield..." : ""}
                </motion.div>

                {/* Animated ring */}
                <svg className="countdown-ring" viewBox="0 0 100 100">
                    <circle
                        className="countdown-ring-bg"
                        cx="50"
                        cy="50"
                        r="45"
                    />
                    <motion.circle
                        className="countdown-ring-progress"
                        cx="50"
                        cy="50"
                        r="45"
                        style={{ stroke: getColorVar() }}
                        initial={{ pathLength: 1 }}
                        animate={{ pathLength: displayNumber / 5 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </svg>
            </motion.div>
        </div>
    );
};

export default GameCountdown;
