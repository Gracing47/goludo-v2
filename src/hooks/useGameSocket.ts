import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';
import { SOCKET_URL } from '../config/api';
import { createInitialState } from '../engine/gameLogic';
import { PLAYER_PATHS } from '../engine/constants';
import { Web3Account, TokenPosition, Player } from '../types';
import soundManager from '../services/SoundManager';

/**
 * useGameSocket Hook
 * 
 * Manages the WebSocket connection for multiplayer matches.
 * Handles event listeners and maps server updates to the Zustand store.
 */
export const useGameSocket = (roomId: string | undefined, account: Web3Account | null) => {
    const {
        setSocket, updateState, setGameState, setConfig,
        setAppState, setBoardRotation, setServerMsg,
        setTurnTimer, setIsRolling, setIsMoving,
        setGameCountdown, setShowCountdown
    } = useGameStore(useShallow((s) => ({
        setSocket: s.setSocket,
        updateState: s.updateState,
        setGameState: s.setGameState,
        setConfig: s.setConfig,
        setAppState: s.setAppState,
        setBoardRotation: s.setBoardRotation,
        setServerMsg: s.setServerMsg,
        setTurnTimer: s.setTurnTimer,
        setIsRolling: s.setIsRolling,
        setIsMoving: s.setIsMoving,
        setGameCountdown: s.setGameCountdown,
        setShowCountdown: s.setShowCountdown,
    })));

    const socketRef = useRef<Socket | null>(null);

    // 🔗 Socket Initialization & Event Handlers
    const connect = useCallback(() => {
        if (!roomId || !account?.address) return;

        const targetAddr = account.address;

        // Prevent double connection if already active for this room
        if (socketRef.current && socketRef.current.connected) {
            const currentSocket = socketRef.current as any;
            if (currentSocket._targetRoom === roomId && currentSocket._targetAddr === targetAddr) {
                return;
            }
            socketRef.current.disconnect();
        }

        console.log('🌐 Web3 Match: Connecting to socket...', { roomId, address: targetAddr });

        const socket = io(SOCKET_URL, {
            query: { roomId, userAddress: targetAddr },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'], // Force websocket first for better reliability
            timeout: 10000, // Reduced connection timeout
        });

        // Tag socket for room persistence
        const taggedSocket = socket as any;
        taggedSocket._targetRoom = roomId;
        taggedSocket._targetAddr = targetAddr;

        socket.on('connect', () => {
            console.log('✅ Socket connected! ID:', socket.id, 'Transport:', socket.io.engine.transport.name);
            socket.emit('join_match', { roomId, playerAddress: targetAddr });
            setServerMsg(null);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message, 'Transport:', socket.io.engine.transport.name);
            setServerMsg(`📡 Connection error: ${error.message}`);
        });

        socket.on('game_error', (error) => {
            console.error('❌ Game error:', error.message);
            setServerMsg(`❌ ${error.message}`);
            // Reset flags to allow retry
            setIsRolling(false);
            setIsMoving(false);
            setTimeout(() => setServerMsg(null), 5000);
        });

        socket.on('disconnect', (reason) => {
            console.warn('🔌 Socket disconnected:', reason);
            if (reason === "io server disconnect" || reason === "transport close" || reason === "ping timeout") {
                setServerMsg("🔌 Connection lost. Reconnecting...");
            }
        });

        socket.io.on("reconnect_attempt", (attempt) => {
            console.log(`📡 Reconnection attempt #${attempt}`);
        });

        socket.io.on("reconnect", (attempt) => {
            console.log(`✅ Reconnected on attempt #${attempt}`);
            setServerMsg("✅ Back online! Resyncing...");
            // Force re-join to ensure server knows we are back on this socket ID
            socket.emit('join_match', { roomId, playerAddress: targetAddr });
            setTimeout(() => setServerMsg(null), 2000);
        });

        socket.on('dice_rolled', ({ value, playerIndex }) => {
            console.log(`🎲 Socket Event: dice_rolled value=${value} for player=${playerIndex}`);
            updateState({ diceValue: value });
            setIsRolling(true);
            if (value !== 6) setServerMsg(null);
            setTimeout(() => setIsRolling(false), 700);
        });

        socket.on('state_update', (update) => {
            if (update.msg) setServerMsg(update.msg);

            // Safety: If we get a state update, the game is definitely not in initial countdown anymore
            setShowCountdown(false);

            const currentState = useGameStore.getState().state;
            const activeAnim = useGameStore.getState().activeMovingToken;

            // 🤖 SMART ANIMATION: Detect if an opponent moved a token
            if (update.tokens && currentState?.tokens) {
                let movedToken: { p: number, t: number, from: TokenPosition, to: TokenPosition } | null = null;

                for (let p = 0; p < 4; p++) {
                    for (let t = 0; t < 4; t++) {
                        const oldPos = currentState.tokens[p]?.[t];
                        const newPos = update.tokens[p]?.[t];

                        if (oldPos !== undefined && newPos !== undefined && oldPos !== newPos) {
                            // Skip if we are already animating this token locally
                            if (activeAnim && activeAnim.playerIdx === p && activeAnim.tokenIdx === t) {
                                continue;
                            }
                            movedToken = { p, t, from: oldPos, to: newPos };
                            break;
                        }
                    }
                    if (movedToken) break;
                }

                if (movedToken) {
                    const { p, t, from, to } = movedToken;
                    const path = PLAYER_PATHS[p];
                    if (!path) return; // Safety check
                    const fromIdx = path.indexOf(from);
                    const toIdx = path.indexOf(to);

                    if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx) {
                        const traversePath = path.slice(fromIdx + 1, toIdx + 1);
                        const hopDuration = 120; // Snappier sync speed (120ms instead of 150ms)
                        setIsMoving(true);

                        // 1. Update everything EXCEPT the tokens first (or use prev tokens)
                        const partialUpdate = { ...update, tokens: currentState.tokens };
                        updateState(partialUpdate);

                        // 2. Animate the steps
                        traversePath.forEach((pos: TokenPosition, index: number) => {
                            setTimeout(() => {
                                setGameState((prev) => {
                                    if (!prev) return prev;
                                    const newTokens = prev.tokens.map((arr) => [...arr]);
                                    newTokens[p][t] = pos;

                                    // Trigger move sound
                                    soundManager.play('move');
                                    return { ...prev, tokens: newTokens };
                                });

                                if (index === traversePath.length - 1) {
                                    setIsMoving(false);
                                    soundManager.play('land');
                                    // Final sync to ensure everything is perfect
                                    updateState(update);
                                }
                            }, (index + 1) * hopDuration);
                        });

                        // 3. SAFETY FALLBACK: Force consistency after animation ends (plus buffer)
                        // This prevents "stuck" states if the browser throttles timers or something crashes
                        setTimeout(() => {
                            if (useGameStore.getState().isMoving) {
                                console.warn("⚠️ Animation watchdog triggered - forcing state sync");
                                setIsMoving(false);
                                setIsRolling(false);
                                updateState(update);
                            }
                        }, (traversePath.length + 2) * hopDuration);

                        return; // Handled via animation
                    }
                }
            }

            // Default: Instant update if no movement or invalid path
            updateState(update);
            if (update.gamePhase !== 'ROLL_DICE') {
                setIsRolling(false);
            }
            setIsMoving(false);
        });

        // Create a local interval for the timer to avoid socket spam
        let localTimerId: ReturnType<typeof setInterval> | null = null;

        socket.on('turn_timer_start', ({ expiresAt }: { expiresAt: number }) => {
            if (localTimerId) clearInterval(localTimerId);

            const updateTimer = () => {
                const now = Date.now();
                const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
                setTurnTimer(remaining);
                if (remaining <= 0 && localTimerId) {
                    clearInterval(localTimerId);
                    localTimerId = null;
                }
            };

            updateTimer();
            localTimerId = setInterval(updateTimer, 1000);
        });

        // Remove old turn_timer_update handler
        // socket.on('turn_timer_update', ...);

        socket.on('pre_game_countdown', ({ room, countdownSeconds, message }) => {
            console.log('🎬 Pre-game countdown received:', countdownSeconds, 's');

            // Always show countdown - even if state exists (Lobby may have set it early)
            setServerMsg(message);
            setGameCountdown(countdownSeconds);
            setShowCountdown(true);
            setAppState('game'); // Force transition to game view

            setConfig({
                mode: 'web3',
                gameMode: 'classic',
                roomId: room.id,
                stake: room.stake,
                playerCount: room.players.filter((p: Player) => p).length,
                players: room.players.map((p: Player, idx: number) => p ? ({
                    id: idx,
                    name: p.name,
                    color: p.color,
                    address: p.address,
                    type: 'human',
                    isAI: false
                }) : null) as Player[]
            });

            // Perspective rotation
            const myIdx = room.players.findIndex((p: Player) =>
                p?.address?.toLowerCase() === account.address?.toLowerCase()
            );
            if (myIdx !== -1) {
                setBoardRotation((3 - myIdx) * 90);
            }
        });

        socket.on('countdown_tick', ({ remaining }) => {
            console.log(`⏳ Countdown tick: ${remaining}s`);
            setGameCountdown(remaining);

            if (remaining > 0) {
                setShowCountdown(true);
                // Ensure we are in the game view if we see a countdown
                if (useGameStore.getState().appState !== 'game') {
                    setAppState('game');
                }
            } else {
                // Countdown finished - hide overlay (game_started will handle game init)
                setShowCountdown(false);
            }
        });

        socket.on('game_started', (room) => {
            console.log('🎮 Game started event received! Room ID:', room.id, 'Players:', room.players.filter((p: Player) => p).length);

            const activeColors = room.players
                .map((p: Player, idx: number) => p ? idx : null)
                .filter((idx: any) => idx !== null) as number[];

            setConfig({
                mode: 'web3',
                gameMode: 'classic',
                roomId: room.id,
                stake: room.stake,
                playerCount: room.players.filter((p: Player) => p).length,
                players: room.players.map((p: Player, idx: number) => p ? ({
                    id: idx,
                    name: p.name,
                    color: p.color,
                    address: p.address,
                    type: 'human',
                    isAI: false
                }) : null) as Player[]
            });

            // AAA FIX: Use server-side gameState if it exists (reconnect scenario)
            // This prevents the board from resetting to 0 tokens for a split second
            if (room.gameState) {
                console.log("📥 Resuming game with server-provided state");
                setGameState(room.gameState);
            } else {
                console.log("🆕 Starting fresh game state");
                setGameState(createInitialState(4, activeColors) as any);
            }

            setShowCountdown(false); // Hide countdown overlay
            setAppState('game');
            setServerMsg("Game Started!");

            const myIdx = room.players.findIndex((p: Player) =>
                p?.address?.toLowerCase() === account?.address?.toLowerCase()
            );
            if (myIdx !== -1) {
                setBoardRotation((3 - myIdx) * 90);

                // Sync turn timer from server if available (persistence)
                if (room.turnExpiresAt) {
                    const remaining = Math.max(0, Math.floor((room.turnExpiresAt - Date.now()) / 1000));
                    setTurnTimer(remaining);
                } else {
                    setTurnTimer(Math.floor((room.timeoutMs || 30000) / 1000));
                }
            }
        });

        socket.on('turn_timeout', ({ playerName }) => {
            setTurnTimer(0);
            setServerMsg(`⏰ ${playerName} timed out!`);
            setTimeout(() => setServerMsg(null), 3000);
        });

        socketRef.current = socket;
        setSocket(socket);

        return () => {
            socket.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, [roomId, account?.address, setSocket, updateState, setIsRolling, setServerMsg, setIsMoving, setTurnTimer, setConfig, setGameState, setAppState, setBoardRotation]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // 📤 Actions
    const emitRoll = useCallback(() => {
        if (!socketRef.current?.connected) return false;
        socketRef.current.emit('roll_dice', {
            roomId,
            playerAddress: account?.address
        });
        return true;
    }, [roomId, account?.address]);

    const emitMove = useCallback((tokenIndex: number) => {
        if (!socketRef.current?.connected) return false;
        socketRef.current.emit('move_token', {
            roomId,
            playerAddress: account?.address,
            tokenIndex
        });
        return true;
    }, [roomId, account?.address]);

    return {
        socket: socketRef.current,
        isConnected: socketRef.current?.connected ?? false,
        connect,
        emitRoll,
        emitMove
    };
};
