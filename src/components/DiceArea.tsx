import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Dice from './Dice';
import './DiceArea.css';

interface DiceAreaProps {
    showCountdown: boolean;
    countdown: number;
    playerName?: string;
    playerColor?: string;
    diceValue: number;
    onRoll: () => void;
    canRoll: boolean;
    isRolling: boolean;
}

/**
 * DiceArea - Integrated Dice + Countdown Display
 * Replaces the full-screen countdown overlay with an in-dice countdown
 */
const DiceArea: React.FC<DiceAreaProps> = ({
    showCountdown,
    countdown,
    playerName,
    playerColor = '#22d3ee',
    diceValue,
    onRoll,
    canRoll,
    isRolling
}) => {
    // Map player color name to hex
    const getColorValue = (color: string) => {
        const colorMap: Record<string, string> = {
            'red': '#ff3e3e',
            'green': '#00ff88',
            'yellow': '#ffcc00',
            'blue': '#00a2ff',
            'cyan': '#22d3ee'
        };
        return colorMap[color.toLowerCase()] || color;
    };

    const activeColor = getColorValue(playerColor);

    return (
        <div className="dice-area-container">
            <AnimatePresence mode="wait">
                {showCountdown ? (
                    <motion.div
                        key="countdown"
                        className="dice-countdown-integrated"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Glow Effect */}
                        <div
                            className="countdown-glow"
                            style={{
                                backgroundColor: activeColor,
                                boxShadow: `0 0 40px ${activeColor}80`
                            }}
                        />

                        {/* Countdown Number with Circular Progress */}
                        <div className="countdown-circle">
                            <svg className="countdown-progress-ring" viewBox="0 0 100 100">
                                <circle
                                    className="countdown-progress-track"
                                    cx="50"
                                    cy="50"
                                    r="40"
                                />
                                <motion.circle
                                    className="countdown-progress-fill"
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    style={{ stroke: activeColor }}
                                    initial={{ pathLength: 1 }}
                                    animate={{ pathLength: countdown / 5 }}
                                    transition={{ duration: 1, ease: "linear" }}
                                />
                            </svg>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={countdown}
                                    className="countdown-number"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 1.5, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    style={{ color: countdown === 0 ? activeColor : '#fff' }}
                                >
                                    {countdown > 0 ? countdown : "GO!"}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Countdown Text */}
                        <motion.p
                            className="countdown-text"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.8 }}
                        >
                            {countdown > 0
                                ? (playerName ? `Ready, ${playerName}?` : "Get Ready!")
                                : "Good Luck!"}
                        </motion.p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="dice"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Dice
                            value={diceValue}
                            onRoll={onRoll}
                            disabled={!canRoll}
                            isRolling={isRolling}
                            color={activeColor}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </AnimatePresence>
            
            {/* DEBUG LAYER - CATCH ALL CLICKS if Button fails */ }
    <div
        style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            cursor: 'pointer'
        }}
        onClick={() => {
            if (canRoll && !isRolling) onRoll();
        }}
    />
        </div >
    );
};

export default DiceArea;
