/**
 * VICTORY CELEBRATION COMPONENT
 * Iris AAA — premium victory screen
 * Currency: NATIVE_CURRENCY_SYMBOL / formatStake from ../config/currency
 *
 * framer-motion REMOVED (perf sprint) — all animations CSS-only
 */

import React, { useEffect, useState, useRef } from 'react';
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

// FINISHED sentinel from engine/constants — kept local to avoid circular import
const TOKEN_FINISHED = 999;
const TOKENS_PER_PLAYER = 4;

/**
 * Build a sorted standings array from the new optional props.
 * Returns [] when props are absent/empty so caller can skip rendering.
 */
function buildStandings(players, finalTokens) {
    if (!Array.isArray(players) || players.length === 0) return [];
    if (!Array.isArray(finalTokens) || finalTokens.length === 0) return [];

    return players
        .map((player, idx) => {
            const tokens = finalTokens[idx];
            const total  = Array.isArray(tokens) ? tokens.length : TOKENS_PER_PLAYER;
            const home   = Array.isArray(tokens)
                ? tokens.filter(pos => pos === TOKEN_FINISHED).length
                : 0;
            const colorData = PLAYER_COLORS[idx] || PLAYER_COLORS[0];
            return {
                idx,
                name:  player.name || colorData.name,
                color: player.color || colorData.color,
                home,
                total,
                isAI:  Boolean(player.isAI),
            };
        })
        .sort((a, b) => b.home - a.home); // winner (most-home) first
}

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
    potAmount = null,
    // GP-2 — end-game standings (optional; graceful no-op when absent)
    players = null,
    finalTokens = null,
    gameMode = null,
}) {
    const [showContent, setShowContent] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const { playSound } = useGameVFX();
    // Guard: play sound exactly once per unique winner to avoid double-play on re-render
    const hasPlayedRef = useRef(null);

    const winnerData = PLAYER_COLORS[winner] || PLAYER_COLORS[0];

    useEffect(() => {
        if (winner !== null && winner !== undefined) {
            // Only play if this winner identity hasn't been sounded yet
            const soundKey = `${winner}-${isWinner}`;
            if (hasPlayedRef.current !== soundKey) {
                hasPlayedRef.current = soundKey;
                playSound(isWinner ? 'win' : 'lose');
            }

            // Staggered reveal — spring overshoot feels earned
            setTimeout(() => setShowContent(true), 200);
            if (isWinner) {
                setTimeout(() => setShowConfetti(true), 500);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [winner, isWinner, playSound]);

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

    // GP-2 — standings (derived; empty array = don't render)
    const standings = buildStandings(players, finalTokens);
    const hasStandings = standings.length > 0;

    return (
        // CSS fade-in replaces framer-motion AnimatePresence outer wrapper
        <div className="victory-celebration vc-fade-in">
            {/* Deep cosmos backdrop */}
            <div className="victory-backdrop vc-backdrop-in" />

            {/* Confetti — winner only */}
            {isWinner && <VictoryConfetti active={showConfetti} winnerColor={winnerData.class} />}

            {/* Main card — conditional CSS enter */}
            {showContent && (
                <div className="victory-content vc-card-enter">
                    {/* Trophy — CSS spring-pop with over-rotate settle */}
                    <div className="victory-trophy vc-trophy-pop">
                        🏆
                    </div>

                    {/* Title */}
                    <h1
                        className={`${titleClass} vc-stagger-1`}
                        style={!isWinner ? { color: '#ff2a6d' } : undefined}
                    >
                        {titleText}
                    </h1>

                    {/* Winner name / congratulations */}
                    <p className="victory-winner vc-stagger-2">
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
                    </p>

                    {/* GP-2 — End-game standings panel */}
                    {hasStandings && (
                        <div
                            className="standings-panel vc-stagger-3"
                            aria-label="Final standings"
                        >
                            <div className="standings-header">STANDINGS</div>
                            <ol className="standings-list" role="list">
                                {standings.map((row, rank) => {
                                    const isTopRow = rank === 0;
                                    return (
                                        <li
                                            key={row.idx}
                                            className={[
                                                'standings-row',
                                                isTopRow ? 'standings-row--winner' : 'standings-row--receded',
                                            ].filter(Boolean).join(' ')}
                                        >
                                            <span
                                                className={`standings-rank${isTopRow ? ' vc-rank-pop' : ''}`}
                                            >{rank + 1}</span>
                                            <span
                                                className="standings-swatch"
                                                style={{ background: row.color }}
                                                aria-hidden="true"
                                            />
                                            <span className="standings-name">
                                                {row.name}
                                                {row.isAI && (
                                                    <span className="standings-ai-badge">AI</span>
                                                )}
                                            </span>
                                            <span className="standings-score">
                                                <span className="standings-home">{row.home}</span>
                                                <span className="standings-sep">/</span>
                                                <span className="standings-total">{row.total}</span>
                                                <span className="standings-label">home</span>
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    )}

                    {/* Orbital glow ring — CSS keyframe infinite */}
                    <div
                        className="victory-ring vc-ring-pulse"
                        style={{ borderColor: isClaimed ? '#ffd700' : winnerData.color }}
                    />

                    {/* Web3 Prize Info */}
                    {isWeb3Match && isWinner && !isClaimed && (
                        <div className="victory-prize vc-stagger-4">
                            <span className="prize-icon">💰</span>
                            <span className="prize-text">{prizeLabel}</span>
                        </div>
                    )}

                    {/* Loser message */}
                    {!isWinner && (
                        <div className="loser-message vc-stagger-4">
                            <span>Better luck next time! 🎲</span>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="victory-actions vc-stagger-5">
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
                    </div>
                </div>
            )}
        </div>
    );
}
