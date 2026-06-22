/**
 * VICTORY CELEBRATION COMPONENT
 * Iris AAA — premium victory screen
 * Currency: NATIVE_CURRENCY_SYMBOL / formatStake from ../config/currency
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VictoryConfetti } from './ParticleEffects';
import { useGameVFX } from '../hooks/useGameVFX';
import { NATIVE_CURRENCY_SYMBOL, formatStake } from '../config/currency';
import './VictoryCelebration.css';

// Iris neon color map (no purple)
const PLAYER_COLORS = {
    0: { name: 'Red',    color: '#ff2a6d', class: 'red'    },
    1: { name: 'Green',  color: '#00ff9d', class: 'green'  },
    2: { name: 'Yellow', color: '#ffcc00', class: 'yellow' },
    3: { name: 'Blue',   color: '#05d9e8', class: 'blue'   }
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

    // Prize display — uses formatStake from currency config
    const prizeLabel = potAmount
        ? `You won ${formatStake(potAmount)}!`
        : `Claim your prize from the vault!`;

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
                            initial={{ scale: 0.80, opacity: 0, y: 44 }}
                            animate={{ scale: 1,    opacity: 1, y: 0  }}
                            exit={{ scale: 1.06,   opacity: 0, y: -22 }}
                            transition={{
                                type:      'spring',
                                stiffness: 300,
                                damping:   18,
                                delay:     0.08
                            }}
                        >
                            {/* Trophy — spring pop with over-rotate settle */}
                            <motion.div
                                className="victory-trophy"
                                initial={{ scale: 0, rotate: -28, y: 10 }}
                                animate={{ scale: 1, rotate: 0,   y: 0  }}
                                transition={{
                                    type:      'spring',
                                    stiffness: 380,
                                    damping:   12,
                                    delay:     0.28
                                }}
                            >
                                🏆
                            </motion.div>

                            {/* Title */}
                            <motion.h1
                                className={titleClass}
                                initial={{ y: 32, opacity: 0, scale: 0.88 }}
                                animate={{ y: 0,  opacity: 1, scale: 1    }}
                                transition={{
                                    delay: 0.44,
                                    type:  'spring',
                                    stiffness: 320,
                                    damping:   20
                                }}
                                style={!isWinner ? { color: '#ff2a6d' } : undefined}
                            >
                                {titleText}
                            </motion.h1>

                            {/* Winner name / congratulations */}
                            <motion.p
                                className="victory-winner"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0,  opacity: 1 }}
                                transition={{ delay: 0.60 }}
                            >
                                {isWinner
                                    ? (isClaimed
                                        ? `Funds transferred to your wallet.`
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
                                initial={{ scale: 0.65, opacity: 0 }}
                                animate={{
                                    scale:   [0.65, 1.18, 0.92, 1.06, 1],
                                    opacity: [0,    0.45, 0.22, 0.32, 0.24]
                                }}
                                transition={{
                                    duration:    2.8,
                                    times:       [0, 0.28, 0.50, 0.72, 1],
                                    repeat:      Infinity,
                                    repeatType:  'loop',
                                    repeatDelay: 0.4
                                }}
                            />

                            {/* Web3 Prize Info — currency-agnostic via config */}
                            {isWeb3Match && isWinner && !isClaimed && (
                                <motion.div
                                    className="victory-prize"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0,  opacity: 1 }}
                                    transition={{ delay: 0.75 }}
                                >
                                    <span className="prize-icon">💰</span>
                                    <span className="prize-text">
                                        {prizeLabel}
                                    </span>
                                </motion.div>
                            )}

                            {/* Loser message */}
                            {!isWinner && (
                                <motion.div
                                    className="loser-message"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0,  opacity: 1 }}
                                    transition={{ delay: 0.75 }}
                                >
                                    <span>Better luck next time! 🎲</span>
                                </motion.div>
                            )}

                            {/* Action buttons */}
                            <motion.div
                                className="victory-actions"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0,  opacity: 1 }}
                                transition={{ delay: 0.92 }}
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
                                                {isClaiming ? '⏳ Claiming…' : `💰 Claim ${NATIVE_CURRENCY_SYMBOL}`}
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
