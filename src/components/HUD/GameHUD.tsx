import React from 'react';
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
    isConnected,
    appState
}) => {
    // Grace period to prevent "Reconnecting" flash on start
    const [showDisconnect, setShowDisconnect] = React.useState(false);

    React.useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isConnected) {
            timer = setTimeout(() => setShowDisconnect(true), 3000);
        } else {
            setShowDisconnect(false);
        }
        return () => clearTimeout(timer);
    }, [isConnected]);

    return (
        <div className="game-hud">
            {/* MODE BADGE */}
            {gameState && (
                <div className={`mode-badge ${gameState.mode === 'rapid' ? 'rapid-mode' : 'classic-mode'}`}>
                    {gameState.mode === 'rapid' ? '⚡ RAPID' : '🎲 CLASSIC'}
                </div>
            )}

            {/* DISCONNECT OVERLAY (Web3 Only) */}
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
