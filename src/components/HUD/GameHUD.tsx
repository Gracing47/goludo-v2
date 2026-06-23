import React from 'react';
import { GameConfig, GameState } from '../../types';
import { PLAYER_COLORS, POSITION } from '../../engine/constants';
import './GameHUD.css';

interface GameHUDProps {
    gameState: GameState;
    gameConfig: GameConfig;
    account: any;
    turnTimer: number | null;
    boardRotation: number;
    isConnected: boolean;
    appState: string;
}

/* ============================================
   TOAST SYSTEM
   ============================================ */

type ToastKind = 'capture' | 'six' | 'home';

interface Toast {
    id: number;
    kind: ToastKind;
    text: string;
    /** set to true while the exit animation is playing */
    exiting: boolean;
}

let _toastCounter = 0;

const TOAST_LIFETIME_MS = 2500;
const TOAST_EXIT_MS     = 360; // matches --dur-normal

/**
 * Map a player index to a display name from gameConfig.
 * Falls back to "Player N".
 */
function playerName(idx: number, gameConfig: GameConfig): string {
    return gameConfig?.players?.[idx]?.name || `Player ${idx + 1}`;
}


/* ============================================
   MAIN COMPONENT
   ============================================ */

const GameHUD: React.FC<GameHUDProps> = ({
    gameState,
    gameConfig,
    account,
    isConnected,
    appState
}) => {
    // ---- Disconnect grace-period ----
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

    // ---- Turn / action status ----
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

    // ---- Toast queue state ----
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    // Separate assertive announcer text — SR users get capture events immediately.
    const [assertiveAnnounce, setAssertiveAnnounce] = React.useState('');

    // Refs used for diffing — we never want stale closures in effects
    const prevTokensRef  = React.useRef<GameState['tokens'] | null>(null);
    const prevDiceRef    = React.useRef<number | null>(null);

    // Helper: push a new toast, schedule its exit + removal
    const pushToast = React.useCallback((kind: ToastKind, text: string) => {
        const id = ++_toastCounter;

        // Capture events are time-critical — announce assertively for SR users.
        if (kind === 'capture') {
            setAssertiveAnnounce(text);
            // Clear after a tick so repeated captures re-trigger the announcement.
            setTimeout(() => setAssertiveAnnounce(''), 100);
        }

        setToasts(prev => {
            // Cap queue at 3 visible at once — drop the oldest
            const capped = prev.length >= 3 ? prev.slice(1) : prev;
            return [...capped, { id, kind, text, exiting: false }];
        });

        // After TOAST_LIFETIME_MS begin exit animation
        const exitTimer = setTimeout(() => {
            setToasts(prev =>
                prev.map(t => (t.id === id ? { ...t, exiting: true } : t))
            );
            // Remove from DOM after animation finishes
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, TOAST_EXIT_MS);
        }, TOAST_LIFETIME_MS);

        return exitTimer;
    }, []);

    // Clean up all timers on unmount
    const timerIdsRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
    React.useEffect(() => {
        return () => {
            timerIdsRef.current.forEach(clearTimeout);
        };
    }, []);

    // ---- Diff effect: detect captures, sixes, homes ----
    React.useEffect(() => {
        if (!gameState || !gameConfig) {
            prevTokensRef.current = gameState?.tokens ?? null;
            prevDiceRef.current   = gameState?.diceValue ?? null;
            return;
        }

        const prevTokens = prevTokensRef.current;
        const prevDice   = prevDiceRef.current;
        const currTokens = gameState.tokens;
        const currDice   = gameState.diceValue;
        const currPhase  = gameState.gamePhase;

        // --- Capture & Home detection (token position diffs) ---
        if (prevTokens && currTokens) {
            for (let pIdx = 0; pIdx < currTokens.length; pIdx++) {
                const prevRow = prevTokens[pIdx];
                const currRow = currTokens[pIdx];
                if (!prevRow || !currRow) continue;

                for (let tIdx = 0; tIdx < currRow.length; tIdx++) {
                    const prev = prevRow[tIdx];
                    const curr = currRow[tIdx];

                    if (prev === curr) continue;

                    // Capture: was on a board position (>= 0 and not FINISHED),
                    // now IN_YARD (-1)
                    const prevNum = prev as number;
                    const currNum = curr as number;

                    if (
                        prevNum >= 0 &&
                        prevNum !== POSITION.FINISHED &&
                        currNum === POSITION.IN_YARD
                    ) {
                        const name  = playerName(pIdx, gameConfig);
                        const timer = pushToast('capture', `💥 ${name} captured!`);
                        timerIdsRef.current.push(timer);
                    }

                    // Home: token became FINISHED (999)
                    if (currNum === POSITION.FINISHED && prevNum !== POSITION.FINISHED) {
                        const name  = playerName(pIdx, gameConfig);
                        const timer = pushToast('home', `🏠 ${name} sent a token home!`);
                        timerIdsRef.current.push(timer);
                    }
                }
            }
        }

        // --- Six detection ---
        // Fire when diceValue just became 6 AND we just transitioned into a
        // roll-result phase (prevents misfiring on stale state re-renders)
        const diceJustBecameSix =
            currDice === 6 &&
            prevDice !== 6;

        const phaseIndicatesRollResult =
            currPhase === 'SELECT_TOKEN' ||
            currPhase === 'BONUS_MOVE'   ||
            currPhase === 'ROLL_DICE';    // server may stay here if next roll needed

        if (diceJustBecameSix && phaseIndicatesRollResult) {
            const timer = pushToast('six', '🎲 Six — roll again!');
            timerIdsRef.current.push(timer);
        }

        // Stash current values for next diff
        prevTokensRef.current = currTokens;
        prevDiceRef.current   = currDice;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState, gameConfig, pushToast]);

    // ---- Render ----
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

            {/* Hidden assertive live region — fires immediately for captures */}
            <span
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
            >
                {assertiveAnnounce}
            </span>

            {/* TOAST REGION */}
            {toasts.length > 0 && (
                <div
                    className="hud-toast-region"
                    aria-live="polite"
                    aria-atomic="false"
                    role="status"
                >
                    {toasts.map(toast => (
                        <div
                            key={toast.id}
                            className={[
                                'hud-toast',
                                `hud-toast--${toast.kind}`,
                                toast.exiting ? 'hud-toast--exit' : ''
                            ].join(' ').trim()}
                        >
                            {toast.text}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(GameHUD);
