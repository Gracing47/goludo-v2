import React, { useCallback } from 'react';
import { PLAYER_COLORS } from '../../engine/constants';
import { GameConfig, GameState } from '../../types';

interface PlayerPodsProps {
    gameConfig: GameConfig;
    gameState: GameState;
    account: any;
    boardRotation: number;
}

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

                return (
                    <div key={idx} className={`pod-anchor pos-${visualPos}`}>
                        <div className={`player-pod ${color} ${isActive ? 'active' : ''} ${isForfeited ? 'forfeited' : ''}`}>
                            <div className={`pod-avatar ${color}`}>
                                {isForfeited ? '💀' : (p.isAI ? '🤖' : '👤')}
                                {isActive && !isForfeited && <div className="pod-turn-indicator" />}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <span className="pod-name">{p.name}{isMe && ' •'}</span>
                                <div className="pod-skips">
                                    <div className={`skip-dot ${skipCount >= 1 ? 'active' : ''}`} title="1 Skip" />
                                    <div className={`skip-dot ${skipCount >= 2 ? 'active' : ''}`} title="2 Skips" />
                                    <div className={`skip-dot ${skipCount >= 3 ? 'active' : ''}`} title="FORFEIT" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default React.memo(PlayerPods);
