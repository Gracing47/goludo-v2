import React from 'react';
import PlayerPods from './PlayerPods';
import { GameConfig, GameState } from '../../types';

interface GameHUDProps {
    gameState: GameState;
    gameConfig: GameConfig;
    account: any;
    turnTimer: number | null;
    boardRotation: number;
    isConnected: boolean;
    appState: string;
}

const GameHUD: React.FC<GameHUDProps> = ({
    gameState,
    gameConfig,
    account,
    turnTimer,
    boardRotation,
    isConnected,
    appState
}) => {
    // Grace period to prevent "Reconnecting" flash on start
    const [showDisconnect, setShowDisconnect] = React.useState(false);

    React.useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isConnected) {
            // Only show after 3 seconds of disconnection
            timer = setTimeout(() => setShowDisconnect(true), 3000);
        } else {
            setShowDisconnect(false);
        }
        return () => clearTimeout(timer);
    }, [isConnected]);

    return (
        <div className="game-hud">
            {/* MODE BADGE - Top Right (below timer) */}
            {gameState && (
                <div className={`mode-badge ${gameState.mode === 'rapid' ? 'rapid-mode' : 'classic-mode'}`}>
                    {gameState.mode === 'rapid' ? '⚡ RAPID' : '🎲 CLASSIC'}
                </div>
            )}
            {/* Turn Timer - Top Center with circular progress */}
            {gameState.gamePhase !== 'WIN' && turnTimer !== null && turnTimer > 0 && (
                <div className="turn-timer-container">
                    <div className={`turn-timer ${turnTimer <= 10 ? 'urgent' : ''}`}>
                        <svg className="turn-timer-ring" viewBox="0 0 36 36">
                            <circle className="turn-timer-track" cx="18" cy="18" r="15" />
                            <circle
                                className="turn-timer-progress"
                                cx="18" cy="18" r="15"
                                style={{
                                    strokeDasharray: `${(turnTimer / 30) * 94.25} 94.25`
                                }}
                            />
                        </svg>
                        <span className="turn-timer-value">{turnTimer}</span>
                    </div>
                </div>
            )}

            {/* A. PLAYER POD CORNER ANCHORS */}
            <PlayerPods
                gameConfig={gameConfig}
                gameState={gameState}
                account={account}
                boardRotation={boardRotation}
            />

            {/* SPECIAL: DISCONNECT OVERLAY (Web3 Only) */}
            {showDisconnect && appState === 'game' && gameState && gameConfig?.mode === 'web3' && (
                <div className="disconnect-overlay">
                    <div className="spinner"></div>
                    <div>Connection Lost. Reconnecting...</div>
                </div>
            )}
        </div>
    );
};

export default React.memo(GameHUD);
