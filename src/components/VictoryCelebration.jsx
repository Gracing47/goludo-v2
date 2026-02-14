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
    isWeb3Match = false,
    isWinner = false,       // Am I the winner?
    payoutProof = null,     // Payout proof for claim
    isClaiming = false,     // Is claim in progress?
    isClaimed = false,      // HAS it been claimed?
    onClaim = () => { },    // Claim callback
    potAmount = null        // Pot amount (string, e.g. "0.2")
}) {
    const [showContent, setShowContent] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const { playSound } = useGameVFX();

    const winnerData = PLAYER_COLORS[winner] || PLAYER_COLORS[0];

    useEffect(() => {
        if (winner !== null && winner !== undefined) {
            // Play appropriate sound based on outcome
            playSound(isWinner ? 'win' : 'lose');

            // Staggered reveal
            setTimeout(() => setShowContent(true), 200);
            // Confetti only for winner
            if (isWinner) {
                setTimeout(() => setShowConfetti(true), 400);
            }
        }
    }, [winner, isWinner]);

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

                {/* Confetti - Only for Winner */}
                {isWinner && <VictoryConfetti active={showConfetti} winnerColor={winnerData.class} />}

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
                                style={{ color: isWinner ? winnerData.color : '#ff4757' }}
                            >
                                {isWinner ? (isClaimed ? 'PAYOUT SENT!' : 'VICTORY!') : 'GAME OVER'}
                            </motion.h1>

                            {/* Winner Name */}
                            <motion.p
                                className="victory-winner"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.7 }}
                            >
                                {isWinner
                                    ? (isClaimed ? 'Funds transferred to your wallet.' : 'Congratulations!')
                                    : <><span style={{ color: winnerData.color, fontWeight: 'bold' }}>{playerName || `${winnerData.name} Player`}</span> Wins!</>}
                            </motion.p>

                            {/* Glowing ring effect */}
                            <motion.div
                                className="victory-ring"
                                style={{ borderColor: isClaimed ? '#ffd700' : winnerData.color }}
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

                            {/* Web3 Prize Info - Only for Winner (Before Claim) */}
                            {isWeb3Match && isWinner && !isClaimed && (
                                <motion.div
                                    className="victory-prize"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.9 }}
                                >
                                    <span className="prize-icon">💰</span>
                                    <span className="prize-text">
                                        {potAmount
                                            ? `You won ${potAmount} C2FLR!`
                                            : 'Claim your prize from the vault!'}
                                    </span>
                                </motion.div>
                            )}

                            {/* Loser Message */}
                            {!isWinner && (
                                <motion.div
                                    className="loser-message"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.9 }}
                                >
                                    <span>Better luck next time! 🎲</span>
                                </motion.div>
                            )}

                            {/* Action Buttons - Context-Aware */}
                            <motion.div
                                className="victory-actions"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.1 }}
                            >
                                {/* Winner View: Claim button or Back to Lobby after claim */}
                                {isWinner && isWeb3Match && (
                                    <>
                                        {isClaimed ? (
                                            <button
                                                className="victory-btn primary"
                                                onClick={onClose}
                                                style={{
                                                    backgroundColor: '#00d26a',
                                                    boxShadow: '0 0 20px rgba(0, 210, 106, 0.4)'
                                                }}
                                            >
                                                🏠 Back to Lobby
                                            </button>
                                        ) : payoutProof ? (
                                            <button
                                                className="victory-btn primary claim-btn"
                                                onClick={onClaim}
                                                disabled={isClaiming}
                                                style={{
                                                    backgroundColor: '#ffd700',
                                                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                                                    color: '#000'
                                                }}
                                            >
                                                {isClaiming ? '⏳ Claiming...' : '💰 Claim Payout'}
                                            </button>
                                        ) : (
                                            <div className="verifying-payout">
                                                <span className="spinner">⏳</span>
                                                Verifying on Blockchain...
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Winner View: Continue button (local games) */}
                                {isWinner && !isWeb3Match && (
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
                                )}

                                {/* Loser View: Back to Lobby */}
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
