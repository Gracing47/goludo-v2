import React, { useCallback } from 'react';
import { PLAYER_COLORS, POSITION } from '../../engine/constants';
import { GameConfig, GameState } from '../../types';

interface PlayerPodsProps {
    gameConfig: GameConfig;
    gameState: GameState;
    account: any;
    boardRotation: number;
}

/* ============================================
   SINGLE POD — memoised so one player's state
   change doesn't re-render the other three.
   ============================================ */

interface PodProps {
    player: any;
    idx: number;
    visualPos: number;
    isActive: boolean;
    color: string | undefined;
    isMe: boolean;
    skipCount: number;
    isForfeited: boolean;
    homeCount: number;
    totalTokens: number;
}

const PlayerPod: React.FC<PodProps> = React.memo(({
    player: p,
    idx,
    visualPos,
    isActive,
    color,
    isMe,
    skipCount,
    isForfeited,
    homeCount,
    totalTokens,
}) => (
    <div key={idx} className={`pod-anchor pos-${visualPos}`}>
        <div className={`player-pod ${color} ${isActive ? 'active' : ''} ${isForfeited ? 'forfeited' : ''}`}>
            {/* Avatar circle with optional turn-indicator orbital rings */}
            <div className={`pod-avatar ${color}`}>
                {isForfeited ? '💀' : (p.isAI ? '🤖' : '👤')}
                {isActive && !isForfeited && (
                    <>
                        <div className="pod-turn-indicator" />
                        <div className="pod-turn-indicator-2" />
                    </>
                )}
            </div>

            {/* Name + skip dots */}
            <div className="pod-info">
                <span className="pod-name">{p.name}{isMe && ' •'}</span>
                <div className="pod-skips">
                    <div className={`skip-dot ${skipCount >= 1 ? 'active' : ''}`} title="1 Skip" />
                    <div className={`skip-dot ${skipCount >= 2 ? 'active' : ''}`} title="2 Skips" />
                    <div className={`skip-dot ${skipCount >= 3 ? 'active' : ''}`} title="FORFEIT" />
                </div>
                {/* Home progress — tokens that have reached home */}
                <div className="pod-progress" title={`${homeCount}/${totalTokens} home`} aria-label={`${homeCount} of ${totalTokens} tokens home`}>
                    {Array.from({ length: totalTokens }).map((_, i) => (
                        <span key={i} className={`home-pip ${i < homeCount ? 'filled' : ''}`} />
                    ))}
                </div>
            </div>
        </div>
    </div>
));

PlayerPod.displayName = 'PlayerPod';

/* ============================================
   CONTAINER
   ============================================ */

const PlayerPods: React.FC<PlayerPodsProps> = ({
    gameConfig,
    gameState,
    account,
    boardRotation
}) => {
    /**
     * Helper: Calculate visual rotation for player pods (0-3)
     */
    const getVisualPositionIndex = useCallback((rawIndex: number) => {
        const rotationSteps = (boardRotation / 90) % 4;
        return (rawIndex + rotationSteps + 4) % 4;
    }, [boardRotation]);

    if (!gameConfig.players) return null;

    return (
        <div className="player-pods-container">
            {gameConfig.players.map((p, idx) => {
                if (!p) return null;
                const visualPos = getVisualPositionIndex(idx);
                const isActive = gameState.activePlayer === idx;
                const color = PLAYER_COLORS[idx];
                const isMe = gameConfig.mode === 'web3'
                    ? p.address?.toLowerCase() === account?.address?.toLowerCase()
                    : !p.isAI && idx === 0;

                const metadata = gameState.playersMetadata?.[idx];
                const skipCount = metadata?.skipCount || 0;
                const isForfeited = metadata?.forfeited || false;

                // Home progress — how many of this player's tokens have finished
                const positions = gameState.tokens?.[idx] || [];
                const totalTokens = positions.length || 4;
                const homeCount = positions.filter((t) => t === POSITION.FINISHED).length;

                return (
                    <PlayerPod
                        key={idx}
                        player={p}
                        idx={idx}
                        visualPos={visualPos}
                        isActive={isActive}
                        color={color}
                        isMe={isMe}
                        skipCount={skipCount}
                        isForfeited={isForfeited}
                        homeCount={homeCount}
                        totalTokens={totalTokens}
                    />
                );
            })}
        </div>
    );
};

export default React.memo(PlayerPods);
