/**
 * VICTORY CELEBRATION COMPONENT
 * Iris AAA — premium victory screen
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VictoryConfetti } from './ParticleEffects';
import { useGameVFX } from '../hooks/useGameVFX';
import './VictoryCelebration.css';

// Iris neon color map (no purple)
const PLAYER_COLORS = {
    0: { name: 'Red',    color: '#ff4757', class: 'red'    },
    1: { name: 'Green',  color: '#00d26a', class: 'green'  },
    2: { name: 'Yellow', color: '#ffbe0b', class: 'yellow' },
    3: { name: 'Blue',   color: '#3a86ff', class: 'blue'   }
};

export default function VictoryCelebration({
    winner,
    playerName,
    onClose,
    isWeb3Match = false,
    isWinner = false,
    payoutProof = null,
    isClaiming = false,
    isClaimed = false,
    onClaim = () => { },
    potAmount = null
}) {
    const [showContent, setShowContent] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const { playSound } = useGameVFX();

    const winnerData = PLAYER_COLORS[winner] || PLAYER_COLORS[0];

    useEffect(() => {
        if (winner !== null && winner !== undefined) {
            playSound(isWinner ? 'win' : 'lose');

            // Staggered reveal — spring overshoot feels earned
            setTimeout(() => setShowContent(true), 200);
            if (isWinner) {
                setTimeout(() => setShowConfetti(true), 500);
            }
        }
    }, [winner, isWinner]);

    if (winner === null || winner === undefined) return null;

    // Victory title state
    const titleText = isWinner
        ? (isClaimed ? 'PAYOUT SENT!' : 'VICTORY!')
        : 'GAME OVER';

    const titleClass = [
        'victory-title',
        winnerData.class,
        isWinner && !isClaimed ? 'winner-gradient' : '',
        !isWinner ? 'game-over-style' : ''
    ].filter(Boolean).join(' ');

    return (
        <AnimatePresence>
            <motion.div
                className="victory-celebration"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
            >
                {/* Deep cosmos backdrop */}
                <motion.div
                    className="victory-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                />

                {/* Confetti — winner only */}
                {isWinner && <VictoryConfetti active={showConfetti} winnerColor={winnerData.class} />}

                {/* Main card */}
                <AnimatePresence>
                    {showContent && (
                        <motion.div
                            className="victory-content"
                            initial={{ scale: 0.82, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 1.04, opacity: 0, y: -20 }}
                            transition={{
                                type: 'spring',
                                stiffness: 280,
                                damping: 18,
                                delay: 0.1
                            }}
                        >
                            {/* Trophy */}
                            <motion.div
                                className="victory-trophy"
                                initial={{ scale: 0, rotate: -24 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 350,
                                    damping: 14,
                                    delay: 0.3
                                }}
                            >
                                🏆
                            </motion.div>

                            {/* Title */}
                            <motion.h1
                                className={titleClass}
                                initial={{ y: 28, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.45, type: 'spring', stiffness: 300, damping: 20 }}
                                /* inline color only for non-gradient states */
                                style={!isWinner ? { color: '#ff4757' } : undefined}
                            >
                                {titleText}
                            </motion.h1>

                            {/* Winner name / congratulations */}
                            <motion.p
                                className="victory-winner"
                                initial={{ y: 18, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                {isWinner
                                    ? (isClaimed
                                        ? 'Funds transferred to your wallet.'
                                        : 'Congratulations!')
                                    : (
                                        <>
                                            <span style={{ color: winnerData.color, fontWeight: 700 }}>
                                                {playerName || `${winnerData.name} Player`}
                                            </span>
                                            {' '}Wins!
                                        </>
                                    )
                                }
                            </motion.p>

                            {/* Orbital glow ring */}
                            <motion.div
                                className="victory-ring"
                                style={{ borderColor: isClaimed ? '#ffd700' : winnerData.color }}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{
                                    scale: [0.7, 1.15, 0.95, 1.05, 1],
                                    opacity: [0, 0.4, 0.25, 0.3, 0.25]
                                }}
                                transition={{
                                    duration: 2.5,
                                    times: [0, 0.3, 0.5, 0.7, 1],
                                    repeat: Infinity,
                                    repeatType: 'loop',
                                    repeatDelay: 0.5
                                }}
                            />

                            {/* Web3 Prize Info */}
                            {isWeb3Match && isWinner && !isClaimed && (
                                <motion.div
                                    className="victory-prize"
                                    initial={{ y: 18, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.75 }}
                                >
                                    <span className="prize-icon">💰</span>
                                    <span className="prize-text">
                                        {potAmount
                                            ? `You won ${potAmount} C2FLR!`
                                            : 'Claim your prize from the vault!'}
                                    </span>
                                </motion.div>
                            )}

                            {/* Loser message */}
                            {!isWinner && (
                                <motion.div
                                    className="loser-message"
                                    initial={{ y: 18, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.75 }}
                                >
                                    <span>Better luck next time! 🎲</span>
                                </motion.div>
                            )}

                            {/* Action buttons */}
                            <motion.div
                                className="victory-actions"
                                initial={{ y: 18, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.9 }}
                            >
                                {/* Winner + Web3 */}
                                {isWinner && isWeb3Match && (
                                    <>
                                        {isClaimed ? (
                                            <button
                                                className="victory-btn primary"
                                                onClick={onClose}
                                                style={{
                                                    background: 'linear-gradient(135deg, #00d26a 0%, #16a34a 100%)',
                                                    boxShadow: '0 0 24px rgba(0, 210, 106, 0.4)'
                                                }}
                                            >
                                                🏠 Back to Lobby
                                            </button>
                                        ) : payoutProof ? (
                                            <button
                                                className="victory-btn primary claim-btn"
                                                onClick={onClaim}
                                                disabled={isClaiming}
                                            >
                                                {isClaiming ? '⏳ Claiming…' : '💰 Claim Payout'}
                                            </button>
                                        ) : (
                                            <div className="verifying-payout">
                                                <span className="spinner">⏳</span>
                                                Verifying on Blockchain…
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Winner + local */}
                                {isWinner && !isWeb3Match && (
                                    <button
                                        className="victory-btn primary"
                                        onClick={onClose}
                                        style={{
                                            background: `linear-gradient(135deg, ${winnerData.color} 0%, rgba(0,0,0,0.2) 100%)`,
                                            boxShadow: `0 0 24px ${winnerData.color}55`
                                        }}
                                    >
                                        Continue
                                    </button>
                                )}

                                {/* Loser */}
                                {!isWinner && (
                                    <button
                                        className="victory-btn secondary"
                                        onClick={onClose}
                                    >
                                        🏠 Back to Lobby
                                    </button>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
