import React from 'react';
import { GameConfig, GameState } from '../../types';
import { PLAYER_COLORS } from '../../engine/constants';

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
    isConnected,
    appState
}) => {
    // Grace period to prevent "Reconnecting" flash on start
    const [showDisconnect, setShowDisconnect] = React.useState(false);

    React.useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (!isConnected) {
            timer = setTimeout(() => setShowDisconnect(true), 3000);
        } else {
            setShowDisconnect(false);
        }
        return () => clearTimeout(timer);
    }, [isConnected]);

    // ---- Turn / action status: whose turn is it + what should they do? ----
    const status = React.useMemo(() => {
        if (!gameState || !gameConfig?.players) return null;
        const idx = gameState.activePlayer;
        const player = gameConfig.players[idx];
        if (!player) return null;

        const name = player.name || `Player ${idx + 1}`;
        const color = PLAYER_COLORS[idx] || 'red';
        const isAI = player.type === 'ai' || (player as any).isAI;
        const isWeb3 = gameConfig.mode === 'web3';
        const isYou = isWeb3
            ? !!account?.address && player.address?.toLowerCase() === account.address.toLowerCase()
            : !isAI;
        const who = isYou ? 'Your turn' : `${name}'s turn`;
        const phase = gameState.gamePhase;
        const dice = gameState.diceValue ?? 0;
        const sixAgain = (gameState.consecutiveSixes || 0) > 0;

        let label = '';
        let action = '';
        let tone: 'act' | 'wait' | 'ai' = 'wait';

        if (isAI) {
            label = name;
            action = 'thinking…';
            tone = 'ai';
        } else if (phase === 'ROLL_DICE' || phase === 'WAITING_FOR_ROLL') {
            label = who;
            action = sixAgain ? 'Rolled a 6 — roll again!' : 'Roll the dice';
            tone = isYou ? 'act' : 'wait';
        } else if (phase === 'SELECT_TOKEN' || phase === 'BONUS_MOVE') {
            label = who;
            action = dice > 0 ? `Rolled ${dice} — move a token` : 'Select a token';
            tone = isYou ? 'act' : 'wait';
        } else if (phase === 'MOVING' || phase === 'ANIMATING') {
            label = name;
            action = 'moving…';
            tone = 'wait';
        } else {
            return null;
        }

        return { color, label, action, tone };
    }, [gameState, gameConfig, account]);

    return (
        <div className="game-hud">
            {/* MODE BADGE — Iris HUD Chip */}
            {gameState && (
                <div className={`mode-badge ${gameState.mode === 'rapid' ? 'rapid-mode' : 'classic-mode'}`}>
                    {gameState.mode === 'rapid' ? '⚡ RAPID' : '🎲 CLASSIC'}
                </div>
            )}

            {/* TURN / ACTION STATUS — the player always knows whose turn + what to do */}
            {status && gameState.gamePhase !== 'WIN' && (
                <div
                    className={`turn-status tone-${status.tone} pod-${status.color}`}
                    role="status"
                    aria-live="polite"
                >
                    <span className="turn-status-dot" />
                    <div className="turn-status-body">
                        <span className="turn-status-label">{status.label}</span>
                        <span className="turn-status-action">{status.action}</span>
                    </div>
                </div>
            )}

            {/* DISCONNECT OVERLAY (Web3 Only) */}
            {showDisconnect && appState === 'game' && gameState && gameConfig?.mode === 'web3' && (
                <div className="disconnect-overlay">
                    <div className="spinner"></div>
                    <div className="disconnect-msg">Connection Lost — Reconnecting…</div>
                </div>
            )}
        </div>
    );
};

export default React.memo(GameHUD);
