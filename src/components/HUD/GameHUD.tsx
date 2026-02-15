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
    return (
        <div className="game-hud">
            {/* Turn Timer - Top Center */}
            {gameState.gamePhase !== 'WIN' && turnTimer !== null && turnTimer > 0 && (
                <div className="turn-timer-container">
                    <div className={`turn-timer ${turnTimer <= 10 ? 'urgent' : ''}`}>
                        ⏱️ {turnTimer}s
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
            {!isConnected && appState === 'game' && gameState && gameConfig?.mode === 'web3' && (
                <div className="disconnect-overlay">
                    <div className="spinner"></div>
                    <div>Connection Lost. Reconnecting...</div>
                </div>
            )}
        </div>
    );
};

export default React.memo(GameHUD);
