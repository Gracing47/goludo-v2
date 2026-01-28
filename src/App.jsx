/**
 * MAIN APP COMPONENT - GoLudo
 * Central game container managing state transitions, socket events, and engine integration.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { ethers } from 'ethers';
import Lobby from './components/Lobby';
import Board from './components/Board';
import Token from './components/Token';
import Dice from './components/Dice';

const BUILD_VERSION = "v4.3 - Robust Reconnect";
import CaptureExplosion from './components/CaptureExplosion';
import VictoryCelebration from './components/VictoryCelebration';
import { SpawnSparkle } from './components/ParticleEffects';
import soundManager from './services/SoundManager';
import { useLudoWeb3 } from './hooks/useLudoWeb3';
import { useNavigate, useParams } from 'react-router-dom';
import { API_URL, SOCKET_URL } from './config/api';

import WarpTransition from './components/WarpTransition';
import GameCountdown from './components/GameCountdown';

import './App.css';

// Zustand Store
import { useGameStore } from './store/useGameStore';
import { useShallow } from 'zustand/shallow';

import {
    PLAYER_COLORS,
    MASTER_LOOP,
    HOME_STRETCH_COORDS,
    YARD_COORDS,
    POSITION,
    PLAYER_START_POSITIONS,
    SAFE_POSITIONS
} from './engine/constants';

import {
    createInitialState,
    rollDice,
    moveToken,
    completeMoveAnimation
} from './engine/gameLogic';

import { calculateAIMove } from './engine/aiEngine';

function App() {
    // ============================================
    // ZUSTAND STORE - Single Source of Truth
    // ============================================
    const {
        appState, setAppState,
        config: gameConfig, setConfig: setGameConfig,
        state: gameState, setState: setGameState,
        updateState, // Import updateState action
        isRolling, setIsRolling,
        isMoving, setIsMoving,
        boardRotation, setBoardRotation,
        serverMsg, setServerMsg,
        turnTimer, setTurnTimer,
        payoutProof, setPayoutProof,
        socket, setSocket,
        reset: resetStore,
    } = useGameStore(useShallow((s) => ({
        appState: s.appState,
        setAppState: s.setAppState,
        config: s.config,
        setConfig: s.setConfig,
        state: s.state,
        setState: s.setState,
        updateState: s.updateState, // Map updateState
        isRolling: s.isRolling,
        setIsRolling: s.setIsRolling,
        isMoving: s.isMoving,
        setIsMoving: s.setIsMoving,
        boardRotation: s.boardRotation,
        setBoardRotation: s.setBoardRotation,
        serverMsg: s.serverMsg,
        setServerMsg: s.setServerMsg,
        turnTimer: s.turnTimer,
        setTurnTimer: s.setTurnTimer,
        payoutProof: s.payoutProof,
        setPayoutProof: s.setPayoutProof,
        socket: s.socket,
        setSocket: s.setSocket,
        reset: s.reset,
    })));

    // React Router hooks
    const navigate = useNavigate();
    const { roomId: gameId } = useParams();

    // Ref to prevent double AI actions
    const aiActionInProgress = useRef(false);

    // Socket ref for direct access
    const socketRef = useRef(null);

    // Sync isRolling to ref for safety timeouts
    const isRollingRef = useRef(isRolling);
    useEffect(() => { isRollingRef.current = isRolling; }, [isRolling]);

    // Local state for claiming (not needed in global store)
    const [isClaiming, setIsClaiming] = useState(false);

    // Countdown state for pre-game animation
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdown, setCountdown] = useState(5);

    // Screen Shake effect
    const [isShaking, setIsShaking] = useState(false);

    // Web3 Hook
    const { account, handleClaimPayout } = useLudoWeb3();

    // ============================================
    // DATA DERIVATION (Memos & Helpers)
    // ============================================

    // Get token coordinates with stacking info
    const getTokensWithCoords = useCallback(() => {
        if (!gameState || !gameState.tokens || !Array.isArray(gameState.tokens)) {
            return [];
        }

        // 1. Group by grid position
        const cellMap = new Map();

        gameState.tokens.forEach((playerTokens, playerIdx) => {
            if (!Array.isArray(playerTokens)) return;
            playerTokens.forEach((position, tokenIdx) => {
                let coords = null;
                let inYard = false;

                if (position === POSITION.IN_YARD) {
                    coords = YARD_COORDS[playerIdx][tokenIdx];
                    inYard = true;
                } else if (position === POSITION.FINISHED) {
                    // Anchor to player's corner in the goal area
                    const goalCoords = [
                        { r: 6, c: 6 }, // Red (Top Left)
                        { r: 6, c: 8 }, // Green (Top Right)
                        { r: 8, c: 8 }, // Yellow (Bottom Right)
                        { r: 8, c: 6 }  // Blue (Bottom Left)
                    ];
                    coords = goalCoords[playerIdx];
                } else if (position >= 100 && position < 106) {
                    coords = HOME_STRETCH_COORDS[playerIdx][position - 100];
                } else if (position >= 0 && position < MASTER_LOOP.length) {
                    coords = MASTER_LOOP[position];
                }

                if (!coords) return;

                const posKey = inYard ? `yard-${playerIdx}-${tokenIdx}` : `${coords.r}-${coords.c}`;
                if (!cellMap.has(posKey)) cellMap.set(posKey, new Map());

                // Nest group by playerIdx to collapse same colors
                const playersInCell = cellMap.get(posKey);
                if (!playersInCell.has(playerIdx)) {
                    playersInCell.set(playerIdx, {
                        playerIdx,
                        tokenIndices: [],
                        coords,
                        inYard,
                        position
                    });
                }
                playersInCell.get(playerIdx).tokenIndices.push(tokenIdx);
            });
        });

        // 2. Flatten into visual tokens
        const visualTokens = [];
        cellMap.forEach((playersInCell) => {
            const playerIndices = Array.from(playersInCell.keys()).sort((a, b) => a - b);
            const firstGroup = playersInCell.get(playerIndices[0]);

            // 🛡️ Rule: Only stack side-by-side on Safe Zones (Stars), Yard, or Goal
            const isSafePos = SAFE_POSITIONS.includes(firstGroup.position);
            const isYard = firstGroup.inYard;
            const isGoal = firstGroup.position === POSITION.FINISHED;
            const allowStacking = isSafePos || isYard || isGoal;

            const stackSize = allowStacking ? playerIndices.length : 1;

            playerIndices.forEach((playerIdx, stackIndex) => {
                const group = playersInCell.get(playerIdx);
                visualTokens.push({
                    playerIdx: group.playerIdx,
                    tokenIdx: group.tokenIndices[0],
                    tokenCount: group.tokenIndices.length,
                    coords: group.coords,
                    inYard: group.inYard,
                    stackIndex: allowStacking ? stackIndex : 0,
                    stackSize,
                    allTokenIndices: group.tokenIndices
                });
            });
        });

        return visualTokens;
    }, [gameState]);

    // Memoize expensive calculations for performance
    const tokensWithCoords = useMemo(() => {
        return getTokensWithCoords();
    }, [getTokensWithCoords]);

    const currentPlayer = useMemo(() => {
        if (!gameState || !gameConfig?.players) return null;
        return gameConfig.players[gameState.activePlayer] || null;
    }, [gameConfig?.players, gameState?.activePlayer]);

    const currentColor = useMemo(() => {
        if (!gameState) return null;
        return PLAYER_COLORS[gameState.activePlayer];
    }, [gameState?.activePlayer]);

    const isAITurn = useMemo(() =>
        currentPlayer?.isAI || false,
        [currentPlayer]
    );

    // Turn Logic - MEMOIZED to prevent loop
    const isLocalPlayerTurn = useMemo(() => {
        if (!gameConfig) return false;

        // For Web3 mode: compare addresses
        if (gameConfig.mode === 'web3') {
            if (!currentPlayer || !account?.address) {
                return false;
            }
            const currentAddr = currentPlayer?.address?.toLowerCase();
            const myAddr = account.address.toLowerCase();
            return currentAddr === myAddr;
        }

        // For Local/AI mode: human can always play (when not AI turn)
        return !isAITurn;
    }, [gameConfig?.mode, currentPlayer?.address, account?.address, isAITurn, gameState?.gamePhase]);

    const canRoll = useMemo(() => {
        if (!gameState) return false;
        const phase = gameState.gamePhase;
        const canRollPhase = phase === 'ROLL_DICE' || phase === 'WAITING_FOR_ROLL';
        return canRollPhase && !isRolling && !isMoving && isLocalPlayerTurn;
    }, [gameState?.gamePhase, isRolling, isMoving, isLocalPlayerTurn]);

    // Moving token path state: { playerIdx, tokenIdx, path: [] } | null
    const [activeMovingToken, setActiveMovingToken] = useState(null);

    // Effect: Haptic feedback on rolling a 6
    useEffect(() => {
        if (gameState?.diceValue === 6 && !isRolling) {
            if (navigator.vibrate) {
                navigator.vibrate([10, 30, 10]);
            }
        }
    }, [gameState?.diceValue, isRolling]);

    // Capture explosion effect state: { id, color, row, col }[]
    const [captureEffects, setCaptureEffects] = useState([]);

    // Spawn sparkle effect state: { id, color, row, col }[]
    const [spawnEffects, setSpawnEffects] = useState([]);

    // Land impact effect state: { id, color, row, col }[]
    const [landEffects, setLandEffects] = useState([]);

    // Sound Mute State
    const [isMuted, setIsMuted] = useState(soundManager.isMuted());

    // Menu Dropdown State
    const [menuOpen, setMenuOpen] = useState(false);

    const handleToggleMute = useCallback(() => {
        const newMuted = soundManager.toggleMute();
        setIsMuted(newMuted);
    }, []);

    const handleInteraction = useCallback(() => {
        if (!soundManager.isMuted()) {
            soundManager.playBGM();
        }
        window.removeEventListener('click', handleInteraction);
    }, []);

    // Initialize Audio & Global Events
    useEffect(() => {
        const handleGlobalClick = () => {
            setMenuOpen(false);
        };
        window.addEventListener('click', handleInteraction);
        window.addEventListener('click', handleGlobalClick);
        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('click', handleGlobalClick);
        };
    }, [handleInteraction]);

    // ============================================
    // GAME START LOGIC (Refactored from handleStartGame)
    // ============================================
    const onGameStart = useCallback((config) => {
        aiActionInProgress.current = false;

        if (config.mode === 'web3') {
            const roomId = config.roomId;
            const targetAddr = account?.address || 'anonymous';
            const currentSocket = socketRef.current;

            const isMatchingSocket = currentSocket &&
                currentSocket._targetRoom === roomId &&
                currentSocket._targetAddr === targetAddr;

            // If we already have a matching socket, don't re-init
            if (isMatchingSocket) {
                return;
            }

            // Cleanup existing WRONG or permanently DEAD socket if any
            if (currentSocket) {
                console.log('🔌 Cleaning up old/dead socket before reconnect...');
                currentSocket.disconnect();
            }

            console.log('🌐 Web3 Match: Connecting to socket...');
            aiActionInProgress.current = false;

            const socket = io(SOCKET_URL, {
                query: { roomId: config.roomId, userAddress: account?.address || 'anonymous' },
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
            });

            // Tag socket for persistence checks
            socket._targetRoom = config.roomId;
            socket._targetAddr = account?.address || 'anonymous';

            socketRef.current = socket;
            setSocket(socket);

            socket.on('connect', () => {
                console.log('✅ Socket connected! ID:', socket.id);
                console.log('📤 Emitting join_match for room:', config.roomId);
                socket.emit('join_match', {
                    roomId: config.roomId,
                    playerAddress: account?.address
                });
            });

            socket.on('connect_error', (error) => {
                console.error('❌ Socket connection error:', error.message);
                setServerMsg(`📡 Connection error: ${error.message}`);
            });

            socket.on('game_error', (error) => {
                console.error('❌ Game error:', error.message);
                setServerMsg(`❌ ${error.message}`);
                setTimeout(() => setServerMsg(null), 5000);
            });

            socket.on('disconnect', (reason) => {
                console.warn('🔌 Socket disconnected:', reason);
                if (reason === "io server disconnect" || reason === "transport close") {
                    setServerMsg("🔌 Connection lost. Reconnecting...");
                }
            });

            socket.on('dice_rolled', ({ value, playerIndex }) => {
                console.log(`🎲 Socket Event: dice_rolled value=${value} for player=${playerIndex}`);
                // Update diceValue immediately so the 3D dice knows where to land after the roll
                updateState({ diceValue: value });
                setIsRolling(true);
                if (value !== 6) setServerMsg(null);
                setTimeout(() => setIsRolling(false), 700); // 700ms matches Dice.css animation duration
            });

            socket.on('state_update', (update) => {
                if (update.msg) setServerMsg(update.msg);
                updateState(update);

                // Safety: Clear visual locks on every server update
                // Skip if we are mid-animation for a roll just started
                if (update.gamePhase !== 'ROLL_DICE') {
                    setIsRolling(false);
                }
                setIsMoving(false);
            });

            socket.on('turn_timer_start', ({ timeoutMs }) => {
                setTurnTimer(Math.floor(timeoutMs / 1000));
            });

            socket.on('turn_timer_update', ({ remainingMs, remainingSeconds }) => {
                const seconds = remainingSeconds || Math.floor(remainingMs / 1000);
                setTurnTimer(seconds);
            });

            // ============================================
            // PRE-GAME COUNTDOWN EVENTS
            // ============================================
            socket.on('pre_game_countdown', ({ room, countdownSeconds, message }) => {
                console.log('🎬 Pre-game countdown received:', countdownSeconds, 's');

                // Only show countdown if the game hasn't started yet
                // This prevents showing countdown on late reconnects
                if (gameState) {
                    console.log('⏭️ Ignoring countdown - game already in progress');
                    return;
                }

                setCountdown(countdownSeconds);
                setShowCountdown(true);
                setServerMsg(message);

                // Pre-configure game during countdown
                const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
                setGameConfig({
                    mode: 'web3',
                    roomId: room.id,
                    stake: room.stake,
                    playerCount: room.players.filter(p => p).length,
                    players: room.players.map((p, idx) => p ? ({
                        id: idx,
                        name: p.name,
                        color: p.color,
                        address: p.address,
                        type: 'human',
                        isAI: false
                    }) : null)
                });

                // Set board rotation to player's perspective during countdown
                if (account) {
                    const myIdx = room.players.findIndex(p =>
                        p.address?.toLowerCase() === account.address?.toLowerCase()
                    );
                    if (myIdx !== -1) {
                        setBoardRotation((3 - myIdx) * 90);
                    }
                }
            });

            socket.on('countdown_tick', ({ remaining, connectedPlayers, totalPlayers }) => {
                // Ignore countdown ticks if game already started
                if (gameState) return;

                console.log(`⏳ Countdown: ${remaining}s | Players: ${connectedPlayers}/${totalPlayers}`);
                setCountdown(remaining);

                if (remaining <= 0) {
                    // Countdown finished - hide after brief delay for "GO!" animation
                    setTimeout(() => {
                        setShowCountdown(false);
                    }, 800);
                }
            });

            socket.on('game_started', (room) => {
                const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
                const activeColors = room.players.filter(p => p).map(p => colorMap[p.color]);

                setGameConfig({
                    mode: 'web3',
                    roomId: room.id,
                    stake: room.stake,
                    playerCount: room.players.filter(p => p).length,
                    players: room.players.map((p, idx) => p ? ({
                        id: idx,
                        name: p.name,
                        color: p.color,
                        address: p.address,
                        type: 'human',
                        isAI: false
                    }) : null)
                });

                setGameState(createInitialState(4, activeColors));
                setAppState('game');

                if (account) {
                    const myIdx = room.players.findIndex(p =>
                        p?.address?.toLowerCase() === account.address?.toLowerCase()
                    );
                    if (myIdx !== -1) {
                        setBoardRotation((3 - myIdx) * 90);
                    }
                }

                // Set turn timer if provided by server, otherwise use default
                const timeout = room.timeoutMs || room.turnTimeout || 30000;
                setTurnTimer(Math.floor(timeout / 1000));
            });

            socket.on('turn_timer_update', ({ remainingSeconds }) => {
                setTurnTimer(remainingSeconds);
            });

            socket.on('turn_timeout', ({ playerName }) => {
                setTurnTimer(0);
                setServerMsg(`⏰ ${playerName} timed out!`);
                setTimeout(() => setServerMsg(null), 3000);
            });

            // Cleanup on effect change
            return () => {
                socket.disconnect();
                socketRef.current = null;
            };
        } else {
            // ============================================
            // LOCAL/AI MODE: Initialize immediately
            // ============================================
            console.log('🎮 Local mode: Initializing game...');
            setGameConfig(config);

            const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
            const activeColors = config.players.map(p => colorMap[p.color]);

            // Initialize with 4 slots for board consistency, matching the server
            setGameState(createInitialState(4, activeColors));
            setAppState('game');

            // Rotate board so human player's base (player 0) appears at bottom-left
            const humanColorIndex = colorMap[config.players[0].color];
            setBoardRotation((3 - humanColorIndex) * 90);
        }
    }, [account, setGameConfig, setGameState, setAppState, setBoardRotation, setIsRolling, setServerMsg, setTurnTimer, updateState]);

    // Handle Start from Lobby
    const handleStartGame = useCallback((config) => {
        if (config.mode === 'web3') {
            // Update URL for Web3 re-entry
            if (config.roomId) {
                navigate(`/game/${config.roomId}`);
            }
            onGameStart(config);
        } else {
            // Local/AI Mode: Generate unique ID and navigate
            const newGameId = Math.random().toString(36).substring(2, 11);
            navigate(`/game/${newGameId}`);
            onGameStart(config);
        }
    }, [onGameStart, navigate]);

    // ============================================
    // STATE PERSISTENCE (Local & AI)
    // ============================================
    // 1. Persistence Hook: Re-entry (Lobby -> Game) OR Web3 Connection
    useEffect(() => {
        const roomId = gameId; // Use the room ID from URL params
        if (!roomId) return;

        // Case 1: Resume from localStorage (local/AI games)
        if (appState === 'lobby') {
            const savedData = localStorage.getItem(`ludo_game_${roomId}`);
            if (savedData) {
                try {
                    const { config, state } = JSON.parse(savedData);
                    setGameConfig(config);
                    setGameState(state);
                    setAppState('game');
                    return;
                } catch (e) {
                    console.warn("Failed to resume game", e);
                }
            }
        }

        // Case 2: Web3 room needs socket connection
        if (roomId?.length > 20 || gameConfig?.mode === 'web3') {
            const targetAddr = account?.address || 'anonymous';
            const currentSocket = socketRef.current;

            const isMatchingSocket = currentSocket &&
                currentSocket._targetRoom === roomId &&
                currentSocket._targetAddr === targetAddr;

            // Sync check: only init if we don't have a socket object for this room at all
            if (!isMatchingSocket) {
                console.log('🌐 Web3 Session: Initializing connection...', { roomId, account: targetAddr });

                const config = (gameConfig?.mode === 'web3' && gameConfig.roomId === roomId)
                    ? gameConfig
                    : { mode: 'web3', roomId: roomId };

                onGameStart(config);
            }
        }
    }, [gameId, appState, gameConfig, onGameStart, account?.address]);

    // Note: Connection watchdog removed. Socket.IO built-in reconnection is sufficient.

    // 2. Persistence Hook: Auto-save (Local/AI only)
    useEffect(() => {
        if (appState === 'game' && gameId && gameState && gameConfig?.mode !== 'web3') {
            localStorage.setItem(`ludo_game_${gameId}`, JSON.stringify({
                config: gameConfig,
                state: gameState,
                ts: Date.now()
            }));
        }
    }, [gameId, gameState, gameConfig, appState]);

    // Return to lobby
    const handleBackToLobby = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        resetStore();
        aiActionInProgress.current = false;
        navigate('/'); // Go back to root
    }, [resetStore, navigate]);

    // Roll dice
    const handleRoll = useCallback(() => {
        if (!gameState || isRolling || isMoving) return;
        const phase = gameState.gamePhase;
        if (phase !== 'ROLL_DICE' && phase !== 'WAITING_FOR_ROLL') return;

        if (gameConfig?.mode === 'web3') {
            console.log('🎲 Web3 Dice Roll - Socket connected:', !!socketRef.current?.connected);

            if (!socketRef.current?.connected) {
                console.warn('⚠️ Socket disconnected during roll! Attempting emergency reconnect...');
                setServerMsg("📡 Reconnecting...");
                onGameStart(gameConfig);

                // Try again in 1s or show hint
                setTimeout(() => {
                    if (socketRef.current?.connected) {
                        setServerMsg("✅ Reconnected! Try rolling again.");
                        setTimeout(() => setServerMsg(null), 3000);
                    } else {
                        setServerMsg("❌ Connection failed. Please check internet.");
                        setTimeout(() => setServerMsg(null), 3000);
                    }
                }, 1500);
                return;
            }

            setIsRolling(true);
            socketRef.current.emit('roll_dice', {
                roomId: gameConfig.roomId,
                playerAddress: account?.address
            });

            // TIMEOUT SAFETY: If server doesn't respond in 4s, unlock UI
            setTimeout(() => {
                if (isRollingRef.current) {
                    setIsRolling(false);
                    console.warn("⚠️ Network slow? Resetting roll state to allow retry.");
                }
            }, 4000);
            return;
        }

        setIsRolling(true);
        soundManager.play('roll');
        setTimeout(() => {
            const newState = rollDice(gameState);
            setGameState(newState);
            setIsRolling(false);

            // Handle Triple-6 penalty with visual & haptic feedback
            if (newState.message && newState.message.includes('Triple 6')) {
                soundManager.play('penalty'); // Use penalty sound
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                setServerMsg(newState.message);
                setTimeout(() => setServerMsg(null), 2500);
            }

            aiActionInProgress.current = false;
        }, 800);
    }, [gameState, isRolling, isMoving, gameConfig, account]);

    // Execute a move (for both human and AI)
    const executeMove = useCallback((move) => {
        if (!gameState || (gameState.gamePhase !== 'SELECT_TOKEN' && gameState.gamePhase !== 'BONUS_MOVE')) return;

        // ============================================
        // WEB3 MODE: Server is authoritative - only emit and wait
        // ============================================
        if (gameConfig?.mode === 'web3') {
            console.log('📤 Emitting move_token to server:', { tokenIndex: move.tokenIndex, toPosition: move.toPosition });

            socketRef.current?.emit('move_token', {
                roomId: gameConfig.roomId,
                playerAddress: account?.address,
                tokenIndex: move.tokenIndex
            });

            // Play sounds immediately for feedback
            if (move.isSpawn) {
                soundManager.play('spawn');
            } else if (move.captures && move.captures.length > 0) {
                soundManager.play('capture');
                if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
            } else if (move.isHome) {
                soundManager.play('home');
            } else {
                soundManager.play('move');
            }

            // DON'T update local state - wait for state_update from server
            // This prevents state desync between client and server
            setIsMoving(true);
            setTimeout(() => setIsMoving(false), 500);
            return;
        }

        // ============================================
        // LOCAL/AI MODE: Full local state management
        // ============================================

        // 🌟 Spawn Sparkle
        if (move.isSpawn) {
            const startPos = PLAYER_START_POSITIONS[gameState.activePlayer];
            const startCoords = MASTER_LOOP[startPos];

            if (startCoords) {
                const newSpawn = {
                    id: Date.now(),
                    color: PLAYER_COLORS[gameState.activePlayer],
                    row: startCoords.r,
                    col: startCoords.c
                };
                setSpawnEffects(prev => [...prev, newSpawn]);
                setTimeout(() => {
                    setSpawnEffects(prev => prev.filter(e => e.id !== newSpawn.id));
                }, 600);
            }
            soundManager.play('spawn');
        }

        // 💥 Capture Explosion: Trigger if this move has captures
        if (move.captures && move.captures.length > 0) {
            let coords = null;
            const toPos = move.toPosition;
            if (toPos >= 0 && toPos < MASTER_LOOP.length) {
                coords = MASTER_LOOP[toPos];
            } else if (toPos >= 100 && toPos < 106) {
                coords = HOME_STRETCH_COORDS[gameState.activePlayer]?.[toPos - 100];
            }

            if (coords) {
                const newEffect = {
                    id: Date.now(),
                    color: PLAYER_COLORS[move.captures[0].player], // Victim's color
                    row: coords.r,
                    col: coords.c,
                };
                setCaptureEffects(prev => [...prev, newEffect]);
                setTimeout(() => {
                    setCaptureEffects(prev => prev.filter(e => e.id !== newEffect.id));
                }, 500);
            }

            // Haptic feedback & Sound
            if (navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }
            soundManager.play('capture');

            // 🎬 ADDED: Screen Shake
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        } else if (move.isHome) {
            soundManager.play('home');
        } else {
            // Regular move sound
            soundManager.play('move');
        }

        setIsMoving(true);

        const path = move.traversePath || [move.toPosition];
        const playerIdx = gameState.activePlayer;
        const tokenIdx = move.tokenIndex;

        // Dynamic speed: Bonus moves are 2x faster
        const isBonus = gameState.gamePhase === 'BONUS_MOVE';
        const hopDuration = isBonus ? 160 : 320;

        // 🎬 STEP-BY-STEP ANIMATION LOOP
        path.forEach((pos, index) => {
            setTimeout(() => {
                setGameState(prev => {
                    const newTokens = prev.tokens.map(arr => [...arr]);
                    newTokens[playerIdx][tokenIdx] = pos;

                    // Audio tick for each step (except last)
                    if (index < path.length - 1) {
                        soundManager.play('move');
                    }

                    return { ...prev, tokens: newTokens };
                });
            }, index * hopDuration);
        });

        // 🏁 FINAL COMPLETION (Capture, Bonus, Finish)
        setTimeout(() => {
            setGameState(prev => {
                // moveToken handles actual captures and toPosition state
                const stateAfterMove = moveToken(prev, move);
                const newState = completeMoveAnimation(stateAfterMove);

                // FINAL LANDING EFFECTS
                soundManager.play('land');

                const toPos = move.toPosition;
                let coords = null;
                if (toPos >= 0 && toPos < MASTER_LOOP.length) {
                    coords = MASTER_LOOP[toPos];
                } else if (toPos >= 100 && toPos < 106) {
                    coords = HOME_STRETCH_COORDS[gameState.activePlayer]?.[toPos - 100];
                }

                if (coords) {
                    const newLandEffect = {
                        id: Date.now(),
                        color: PLAYER_COLORS[gameState.activePlayer],
                        row: coords.r,
                        col: coords.c
                    };
                    setLandEffects(prev => [...prev, newLandEffect]);
                    setTimeout(() => {
                        setLandEffects(prev => prev.filter(e => e.id !== newLandEffect.id));
                    }, 500);
                }

                if (newState.bonusMoves > 0) {
                    soundManager.play('bonus');
                }

                return newState;
            });

            setIsMoving(false);
            aiActionInProgress.current = false;
        }, path.length * hopDuration + 100);
    }, [gameState, gameConfig, account]);

    // Human token click
    const handleTokenClick = useCallback((playerIndex, tokenIndex) => {
        if (!gameState || (gameState.gamePhase !== 'SELECT_TOKEN' && gameState.gamePhase !== 'BONUS_MOVE')) return;
        if (playerIndex !== gameState.activePlayer) return;

        // Check if it's AI's turn
        const currentPlayer = gameConfig?.players?.[gameState.activePlayer];
        if (currentPlayer?.isAI) return;

        const validMove = gameState.validMoves.find(m => m.tokenIndex === tokenIndex);
        if (!validMove) return;

        soundManager.play('click');
        executeMove(validMove);
    }, [gameState, gameConfig, executeMove]);

    // Reset game
    const handleReset = useCallback(() => {
        setGameState(createInitialState(gameConfig?.playerCount || 4));
        setIsRolling(false);
        setIsMoving(false);
        aiActionInProgress.current = false;
    }, [gameConfig]);

    // AI Turn Handler
    useEffect(() => {
        if (!gameState || !gameConfig || appState !== 'game') return;
        if (isRolling || isMoving) return;
        if (aiActionInProgress.current) return;
        if (gameState.gamePhase === 'WIN') return;

        const currentPlayer = gameConfig.players[gameState.activePlayer];
        if (!currentPlayer?.isAI) return;

        aiActionInProgress.current = true;

        // AI needs to roll
        if (gameState.gamePhase === 'ROLL_DICE') {
            const delay = 800 + Math.random() * 500;
            const timer = setTimeout(() => {
                handleRoll();
            }, delay);
            return () => {
                clearTimeout(timer);
                aiActionInProgress.current = false;
            };
        }

        // AI needs to select token
        if ((gameState.gamePhase === 'SELECT_TOKEN' || gameState.gamePhase === 'BONUS_MOVE') && gameState.validMoves.length > 0) {
            const delay = 500 + Math.random() * 500;
            const timer = setTimeout(() => {
                const bestMove = calculateAIMove(gameState);
                if (bestMove) {
                    executeMove(bestMove);
                } else {
                    aiActionInProgress.current = false;
                }
            }, delay);
            return () => {
                clearTimeout(timer);
                aiActionInProgress.current = false;
            };
        }

        // If turn skipped or no moves, reset lock
        if (gameState.validMoves.length === 0 && gameState.gamePhase !== 'ROLL_DICE') {
            aiActionInProgress.current = false;
        }
    }, [gameState, gameConfig, appState, isRolling, isMoving, handleRoll, executeMove]);

    // ============================================
    // AUTO-MOVE LOGIC (UX Improvement)
    // Automatically executes a move if only 1 option exists
    // ============================================
    useEffect(() => {
        if (!gameState || !isLocalPlayerTurn || isRolling || isMoving) return;

        const phase = gameState.gamePhase;
        if (phase !== 'SELECT_TOKEN' && phase !== 'BONUS_MOVE') return;

        // Only auto-move if there is exactly one valid move
        if (gameState.validMoves?.length === 1) {
            const move = gameState.validMoves[0];

            // 600ms delay gives player time to see the dice result
            const timer = setTimeout(() => {
                executeMove(move);
            }, 600);

            return () => clearTimeout(timer);
        }
    }, [gameState?.validMoves, gameState?.gamePhase, isLocalPlayerTurn, isRolling, isMoving, executeMove]);

    // Web3 Payout Proof Handler & Win Sound
    useEffect(() => {
        if (appState === 'game' && gameState?.gamePhase === 'WIN') {
            // Play success sound
            soundManager.play('win');

            if (gameConfig?.mode === 'web3' && !payoutProof) {
                const winner = gameConfig.players[gameState.winner];
                if (!winner?.address) return;

                const requestPayoutSignature = async () => {
                    try {
                        console.log("🏆 Game Won! Requesting signature...");
                        const potAmount = (BigInt(ethers.parseEther(gameConfig.stake.toString())) * BigInt(gameConfig.playerCount)).toString();

                        const response = await fetch(`${API_URL}/api/payout/sign`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                roomId: gameConfig.roomId,
                                winner: winner.address,
                                amount: potAmount
                            })
                        });

                        const data = await response.json();
                        if (data.error) throw new Error(data.error);
                        setPayoutProof(data);
                    } catch (error) {
                        console.error("Payout signature failed:", error);
                    }
                };
                requestPayoutSignature();
            }
        }
    }, [gameState, gameConfig, appState, payoutProof]);

    const onClaimClick = useCallback(async () => {
        if (!payoutProof || isClaiming) return;
        setIsClaiming(true);
        try {
            await handleClaimPayout(payoutProof);
            setPayoutProof(null);
            alert("Victory! Payout claimed. 💰");
        } catch (err) {
            console.error(err);
            alert("Claim failed: " + (err.message || "Unknown error"));
        } finally {
            setIsClaiming(false);
        }
    }, [payoutProof, isClaiming, handleClaimPayout]);



    // Game loading state - show when game state isn't ready yet
    if (!gameState || !gameConfig) {
        return (
            <WarpTransition mode={gameConfig?.mode === 'web3' ? 'literal' : 'subtle'}>
                <div className="app-loading" style={{ background: 'transparent' }}>
                    <div className="loading-spinner">↻</div>
                    <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '2px' }}>
                        Establishing Connection...
                    </p>
                    {/* Debug info in case it gets stuck */}
                    <div className="loading-debug-info">
                        <p>Room: {gameId?.substring(0, 10)}...</p>
                        <p>Socket: {socketRef.current?.connected ? '✅ Connected' : '⏳ Connecting...'}</p>
                        <p>State: {gameState ? '✅' : '❌'} | Config: {gameConfig ? '✅' : '❌'}</p>
                    </div>
                    <button className="btn-secondary" onClick={handleBackToLobby} style={{ marginTop: 20 }}>
                        Return to Lobby
                    </button>
                    {/* Version Display */}
                    <div style={{
                        position: 'fixed',
                        bottom: '5px',
                        left: '5px',
                        fontSize: '9px',
                        color: 'rgba(255,255,255,0.2)',
                        pointerEvents: 'none'
                    }}>
                        {BUILD_VERSION}
                    </div>
                </div>
            </WarpTransition>
        );
    }

    // Helper: Calculate visual position based on board rotation
    const getVisualPositionIndex = (playerIndex) => {
        const rotationSteps = boardRotation / 90;
        return (playerIndex + rotationSteps) % 4;
    };

    // Helper: Get ticker text
    const getTickerText = () => {
        if (gameState.gamePhase === 'WIN') return "🎉 Game Over!";
        if (canRoll) return "🎲 Tap to Roll!";
        if (gameState.gamePhase === 'SELECT_TOKEN' || gameState.gamePhase === 'BONUS_MOVE') {
            return isLocalPlayerTurn ? "👆 Select Token" : `${currentPlayer?.name}'s Turn`;
        }
        return `${currentPlayer?.name || 'Player'}'s Turn`;
    };

    return (
        <div className={`app aaa-layout ${isShaking ? 'shake-active' : ''}`}>

            {/* 1. BOARD LAYER (Centered) */}
            <div className="board-layer">
                <Board rotation={boardRotation} activePlayer={gameState.activePlayer}>
                    {tokensWithCoords.map(({ playerIdx, tokenIdx, tokenCount, coords, inYard, stackIndex, stackSize, allTokenIndices }) => {
                        const isValid = allTokenIndices.some(idx =>
                            gameState.validMoves?.some(m => m.tokenIndex === idx)
                        );
                        const isHighlighted = isValid &&
                            playerIdx === gameState.activePlayer &&
                            (gameState.gamePhase === 'SELECT_TOKEN' || gameState.gamePhase === 'BONUS_MOVE') &&
                            !isAITurn &&
                            isLocalPlayerTurn;

                        return (
                            <Token
                                key={`${playerIdx}-${tokenIdx}`}
                                playerIndex={playerIdx}
                                tokenIndex={tokenIdx}
                                tokenCount={tokenCount}
                                color={PLAYER_COLORS[playerIdx]}
                                row={coords.r}
                                col={coords.c}
                                onClick={isHighlighted ? () => {
                                    // If multiple tokens can move, the engine usually picks one for the player
                                    // or we could show a mini-selector. For Ludo, usually any valid token works.
                                    const move = gameState.validMoves.find(m => allTokenIndices.includes(m.tokenIndex));
                                    if (move) handleTokenClick(playerIdx, move.tokenIndex);
                                } : null}
                                isHighlighted={isHighlighted}
                                isMoving={isMoving && isHighlighted}
                                inYard={inYard}
                                stackIndex={stackIndex}
                                stackSize={stackSize}
                                rotation={-boardRotation}
                                isBonusMove={activeMovingToken?.tokenIdx === tokenIdx && activeMovingToken?.playerIdx === playerIdx && activeMovingToken?.isBonus}
                            />
                        );
                    })}

                    {/* 💥 Capture Explosions */}
                    {captureEffects.map(effect => (
                        <CaptureExplosion
                            key={effect.id}
                            color={effect.color}
                            row={effect.row}
                            col={effect.col}
                        />
                    ))}

                    {/* ✨ Spawn Sparkles */}
                    {spawnEffects.map(effect => (
                        <SpawnSparkle
                            key={effect.id}
                            color={effect.color}
                            position={{
                                x: (effect.col + 0.5) * (100 / 15) + '%', // Assuming 15x15 board
                                y: (effect.row + 0.5) * (100 / 15) + '%'
                            }}
                            onComplete={() => { }}
                        />
                    ))}

                    {/* 🌊 Land Impact Ripples */}
                    {landEffects.map(effect => (
                        <div
                            key={effect.id}
                            className="land-ripple"
                            style={{
                                gridRow: effect.row + 1,
                                gridColumn: effect.col + 1,
                                '--ripple-color': effect.color
                            }}
                        />
                    ))}
                </Board>
            </div>

            {/* 2. HUD LAYER (Overlay) */}
            <div className="game-hud">

                {/* Turn Timer - Top Center */}
                {gameState.gamePhase !== 'WIN' && turnTimer > 0 && (
                    <div className="turn-timer-container">
                        <div className={`turn-timer ${turnTimer <= 10 ? 'urgent' : ''}`}>
                            ⏱️ {turnTimer}s
                        </div>
                    </div>
                )}

                {/* A. PLAYER POD CORNER ANCHORS */}
                <div className="player-pods-container">
                    {gameConfig.players.map((p, idx) => {
                        if (!p) return null; // Skip empty slots in Web3 sparse array
                        const visualPos = getVisualPositionIndex(idx);
                        const isActive = gameState.activePlayer === idx;
                        const color = PLAYER_COLORS[idx];
                        const isMe = gameConfig.mode === 'web3'
                            ? p.address?.toLowerCase() === account?.address?.toLowerCase()
                            : !p.isAI && idx === 0;

                        return (
                            <div key={idx} className={`pod-anchor pos-${visualPos}`}>
                                <div className={`player-pod ${color} ${isActive ? 'active' : ''}`}>
                                    <div className={`pod-avatar ${color}`}>
                                        {p.isAI ? '🤖' : '👤'}
                                        {isActive && <div className="pod-turn-indicator" />}
                                    </div>
                                    <span className="pod-name">{p.name}{isMe && ' •'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* B. SERVER MESSAGE TOAST */}
                {serverMsg && <div className="server-toast">🔔 {serverMsg}</div>}

                {/* C. WIN SCREEN (Premium Victory Celebration) */}
                {gameState.gamePhase === 'WIN' && (
                    <VictoryCelebration
                        winner={gameState.winner}
                        playerName={gameConfig.players[gameState.winner]?.name || `Player ${gameState.winner + 1}`}
                        isWeb3Match={gameConfig.mode === 'web3'}
                        onClose={handleBackToLobby}
                    />
                )}

                {/* Web3 Claim Button (shown alongside victory) */}
                {gameState.gamePhase === 'WIN' && gameConfig.mode === 'web3' && (
                    <div className="web3-claim-overlay">
                        {payoutProof ? (
                            <button className="btn-claim-payout" onClick={onClaimClick} disabled={isClaiming}>
                                {isClaiming ? 'Claiming...' : '💰 Claim Payout'}
                            </button>
                        ) : (
                            <div className="payout-verifying">
                                <span className="spinner">⏳</span>
                                Verifying on Blockchain...
                            </div>
                        )}
                    </div>
                )}

                {/* D. CENTRAL DICE (Always visible during game) */}
                {gameState.gamePhase !== 'WIN' && (
                    <div className="central-dice-area">
                        <div className={`dice-wrapper ${isRolling ? 'throwing' : 'idle'} ${isLocalPlayerTurn ? 'my-turn' : 'opponent-turn'}`}>
                            <Dice
                                value={gameState.diceValue}
                                onRoll={canRoll ? handleRoll : null}
                                disabled={!canRoll}
                                isRolling={isRolling}
                            />
                        </div>
                    </div>
                )}

                {/* E. FLOATING MENU BUTTON */}
                <div className="menu-dropdown-container">
                    <button className="menu-btn-floating" onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                    }}>
                        ☰
                    </button>
                    {menuOpen && (
                        <div className="menu-dropdown">
                            <button onClick={() => { setMenuOpen(false); window.location.href = '/lobby'; }}>
                                🏠 Lobby
                            </button>
                            <button onClick={() => { handleToggleMute(); setMenuOpen(false); }}>
                                {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                            </button>
                            <button onClick={() => { setMenuOpen(false); handleBackToLobby(); }}>
                                🚪 Leave Game
                            </button>
                        </div>
                    )}
                </div>

                {/* Version Display - Hidden during gameplay */}
            </div>

            {/* 3. COUNTDOWN OVERLAY (Web3 Pre-Game) */}
            {showCountdown && gameConfig && (
                <GameCountdown
                    countdown={countdown}
                    playerName={
                        account
                            ? gameConfig.players?.find(p =>
                                p?.address?.toLowerCase() === account.address?.toLowerCase()
                            )?.name
                            : undefined
                    }
                    playerColor={
                        account
                            ? gameConfig.players?.find(p =>
                                p?.address?.toLowerCase() === account.address?.toLowerCase()
                            )?.color
                            : 'cyan'
                    }
                />
            )}
        </div>
    );
}

export default App;
