/**
 * VICTORY CELEBRATION COMPONENT
 * Premium AAA-quality victory screen with animations
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VictoryConfetti } from './ParticleEffects';
import { useGameVFX } from '../hooks/useGameVFX';
import './VictoryCelebration.css';

// Color map
const PLAYER_COLORS = {
    0: { name: 'Red', color: '#ff4757', class: 'red' },
    1: { name: 'Green', color: '#00d26a', class: 'green' },
    2: { name: 'Yellow', color: '#ffbe0b', class: 'yellow' },
    3: { name: 'Blue', color: '#3a86ff', class: 'blue' }
};

export default function VictoryCelebration({
    winner,
    playerName,
    onClose,
    isWeb3Match = false
}) {
    const [showContent, setShowContent] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const { playSound } = useGameVFX();

    const winnerData = PLAYER_COLORS[winner] || PLAYER_COLORS[0];

    useEffect(() => {
        if (winner !== null && winner !== undefined) {
            // Play victory sound
            playSound('win');

            // Staggered reveal
            setTimeout(() => setShowContent(true), 200);
            setTimeout(() => setShowConfetti(true), 400);
        }
    }, [winner]);

    if (winner === null || winner === undefined) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="victory-celebration"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Background overlay with radial gradient */}
                <motion.div
                    className="victory-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                />

                {/* Confetti */}
                <VictoryConfetti active={showConfetti} winnerColor={winnerData.class} />

                {/* Main Content */}
                <AnimatePresence>
                    {showContent && (
                        <motion.div
                            className="victory-content"
                            initial={{ scale: 0.5, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 200,
                                damping: 15,
                                delay: 0.2
                            }}
                        >
                            {/* Trophy Icon */}
                            <motion.div
                                className="victory-trophy"
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 12,
                                    delay: 0.4
                                }}
                            >
                                🏆
                            </motion.div>

                            {/* Victory Text */}
                            <motion.h1
                                className={`victory-title ${winnerData.class}`}
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                style={{ color: winnerData.color }}
                            >
                                VICTORY!
                            </motion.h1>

                            {/* Winner Name */}
                            <motion.p
                                className="victory-winner"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.7 }}
                            >
                                {playerName || `${winnerData.name} Player`} Wins!
                            </motion.p>

                            {/* Glowing ring effect */}
                            <motion.div
                                className="victory-ring"
                                style={{ borderColor: winnerData.color }}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{
                                    scale: [0.8, 1.2, 1],
                                    opacity: [0, 0.5, 0.3]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatType: 'loop'
                                }}
                            />

                            {/* Web3 Prize Info */}
                            {isWeb3Match && (
                                <motion.div
                                    className="victory-prize"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.9 }}
                                >
                                    <span className="prize-icon">💰</span>
                                    <span className="prize-text">Claim your prize from the vault!</span>
                                </motion.div>
                            )}

                            {/* Action Buttons */}
                            <motion.div
                                className="victory-actions"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.1 }}
                            >
                                <button
                                    className="victory-btn primary"
                                    onClick={onClose}
                                    style={{
                                        backgroundColor: winnerData.color,
                                        boxShadow: `0 0 20px ${winnerData.color}40`
                                    }}
                                >
                                    Continue
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
