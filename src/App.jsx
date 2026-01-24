/**
 * MAIN APP COMPONENT - GoLudo (v2 - Zustand State Management)
 * 
 * Features:
 * - Lobby → Game flow
 * - Intelligent AI with priority-based decisions
 * - Token stacking for multiple tokens on same cell
 * - USA Standard Rules
 * - Unified Zustand state management
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { ethers } from 'ethers';
import Lobby from './components/Lobby';
import Board from './components/Board';
import Token from './components/Token';
import MiniDice from './components/MiniDice';

const BUILD_VERSION = "v4.3 - Robust Reconnect";
import CaptureExplosion from './components/CaptureExplosion';
import VictoryCelebration from './components/VictoryCelebration';
import { SpawnSparkle } from './components/ParticleEffects';
import soundManager from './services/SoundManager';
import { useLudoWeb3 } from './hooks/useLudoWeb3';
import { useNavigate, useParams } from 'react-router-dom';
import { API_URL, SOCKET_URL } from './config/api';

// Phase 4 Polish Components
import Commentator from './components/Commentator';
import WarpTransition from './components/WarpTransition';

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
    PLAYER_START_POSITIONS
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
    const { gameId } = useParams();

    // Ref to prevent double AI actions
    const aiActionInProgress = useRef(false);

    // Socket ref for direct access
    const socketRef = useRef(null);

    // Sync isRolling to ref for safety timeouts
    const isRollingRef = useRef(isRolling);
    useEffect(() => { isRollingRef.current = isRolling; }, [isRolling]);

    // Local state for claiming (not needed in global store)
    const [isClaiming, setIsClaiming] = useState(false);

    // Web3 Hook
    const { account, handleClaimPayout } = useLudoWeb3();

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
                console.log('✅ Socket already matching. Skipping re-init.');
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
            });

            socket.on('disconnect', (reason) => {
                console.warn('🔌 Socket disconnected:', reason);
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
                console.log('📡 Socket Event: state_update', { phase: update.gamePhase, activePlayer: update.activePlayer });
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

            socket.on('game_started', (room) => {
                const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
                const activeColors = room.players.map(p => colorMap[p.color]);

                setGameConfig({
                    mode: 'web3',
                    roomId: room.id,
                    stake: room.stake,
                    playerCount: room.players.length,
                    players: room.players.map((p, idx) => ({
                        id: idx,
                        name: p.name,
                        color: p.color,
                        address: p.address,
                        type: 'human',
                        isAI: false
                    }))
                });

                setGameState(createInitialState(room.players.length, activeColors));
                setAppState('game');

                if (account) {
                    const myIdx = room.players.findIndex(p =>
                        p.address?.toLowerCase() === account.address?.toLowerCase()
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

            setGameState(createInitialState(config.playerCount, activeColors));
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
        if (!gameId) return;

        // Case 1: Resume from localStorage (local/AI games)
        if (appState === 'lobby') {
            const savedData = localStorage.getItem(`ludo_game_${gameId}`);
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
        if (gameId?.length > 20 || gameConfig?.mode === 'web3') {
            const roomId = gameId || gameConfig?.roomId;
            if (!roomId) return;

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

            // TIMEOUT SAFETY: If server doesn't respond in 2.5s, unlock UI
            setTimeout(() => {
                if (isRollingRef.current) { // Need ref to check current state in timeout? 
                    // Actually, just checking if we still haven't received state update
                    // We can just reset isRolling. If event comes later, it handles itself.
                    setIsRolling(false);
                    console.warn("⚠️ Network slow? Resetting roll state to allow retry.");
                }
            }, 2500);
            return;
        }

        setIsRolling(true);
        soundManager.play('roll');
        setTimeout(() => {
            const newState = rollDice(gameState);
            setGameState(newState);
            setIsRolling(false);

            // Handle Triple-6 penalty with visual feedback
            if (newState.message && newState.message.includes('Triple 6')) {
                soundManager.play('capture'); // Penalty sound
                setServerMsg(newState.message);
                setTimeout(() => setServerMsg(null), 2500);
            }

            aiActionInProgress.current = false;
        }, 800);
    }, [gameState, isRolling, isMoving, gameConfig, account]);

    // Execute a move (for both human and AI)
    const executeMove = useCallback((move) => {
        if (!gameState || (gameState.gamePhase !== 'SELECT_TOKEN' && gameState.gamePhase !== 'BONUS_MOVE')) return;

        if (gameConfig?.mode === 'web3') {
            socketRef.current?.emit('move_token', {
                roomId: gameConfig.roomId,
                playerAddress: account?.address,
                tokenIndex: move.tokenIndex
            });
            // Note: We don't advance locally, we wait for state_update or another event?
            // Actually, we SHOULD advance locally for smooth UI, but only if we trust the outcome.
            // But with capture logic, it might be safer to wait for server update.
            // Let's do local update for UI and let server correct if needed.
        }

        // 🌟 Spawn Sparkle
        if (move.isSpawn) {
            const coords = PLAYER_START_POSITIONS[gameState.activePlayer];
            // Correct mapping for spawn point
            const gridPos = PLAYER_START_POSITIONS[gameState.activePlayer]; // Wait, this is position index
            // I need the actual Row/Col for the start position
            // It's in boardMap or constants. PLAYER_START_POSITIONS are indices.
            // Let's use the MASTER_LOOP to get coords for startPos
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
            // ... (rest of capture logic)
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
        } else if (move.isHome) {
            soundManager.play('home');
        } else {
            // Regular move sound
            soundManager.play('move');
        }

        setIsMoving(true);
        setGameState(prev => moveToken(prev, move));

        setTimeout(() => {
            setGameState(prev => {
                const newState = completeMoveAnimation(prev);

                // Audio feedback based on outcome
                soundManager.play('land');
                if (newState.bonusMoves > 0) {
                    soundManager.play('bonus');
                }

                return newState;
            });
            setIsMoving(false);
            aiActionInProgress.current = false;
        }, 400);
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
                        const potAmount = (BigInt(ethers.parseEther(gameConfig.stake.toString())) * BigInt(gameConfig.players.length)).toString();

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

    // Get token coordinates with stacking info
    const getTokensWithCoords = useCallback(() => {
        // Defensive check: ensure gameState and tokens array exist
        if (!gameState || !gameState.tokens || !Array.isArray(gameState.tokens)) {
            return [];
        }

        // Group tokens by position to detect stacking
        const positionMap = new Map();

        gameState.tokens.forEach((playerTokens, playerIdx) => {
            // Skip if playerTokens is not an array
            if (!Array.isArray(playerTokens)) return;
            playerTokens.forEach((position, tokenIdx) => {
                let coords = null;
                let inYard = false;

                if (position === POSITION.IN_YARD) {
                    coords = YARD_COORDS[playerIdx][tokenIdx];
                    inYard = true;
                } else if (position === POSITION.FINISHED) {
                    const offsets = [{ r: 6, c: 6 }, { r: 6, c: 8 }, { r: 8, c: 6 }, { r: 8, c: 8 }];
                    coords = offsets[tokenIdx % 4];
                } else if (position >= 100 && position < 106) {
                    coords = HOME_STRETCH_COORDS[playerIdx][position - 100];
                } else if (position >= 0 && position < MASTER_LOOP.length) {
                    coords = MASTER_LOOP[position];
                }

                if (!coords) return;

                // Create position key for stacking
                const posKey = inYard
                    ? `yard-${playerIdx}-${tokenIdx}` // Yard tokens don't stack
                    : `${coords.r}-${coords.c}`;

                if (!positionMap.has(posKey)) {
                    positionMap.set(posKey, []);
                }

                positionMap.get(posKey).push({
                    playerIdx,
                    tokenIdx,
                    position,
                    coords,
                    inYard
                });
            });
        });

        // Flatten with stack info
        const allTokens = [];
        positionMap.forEach((tokensAtPos) => {
            const stackSize = tokensAtPos.length;
            tokensAtPos.forEach((token, stackIndex) => {
                allTokens.push({
                    ...token,
                    stackIndex,
                    stackSize
                });
            });
        });

        return allTokens;
    }, [gameState]);

    // 🔥 PERFORMANCE FIX: Memoize expensive calculations BEFORE any returns
    // These must be called unconditionally (React Rules of Hooks)
    // 🔥 PERFORMANCE FIX: Memoize expensive calculations
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
            if (!currentPlayer || !account?.address) return false;
            const currentAddr = currentPlayer?.address?.toLowerCase();
            const myAddr = account.address.toLowerCase();
            return currentAddr === myAddr;
        }

        // For Local/AI mode: human can always play (when not AI turn)
        return !isAITurn;
    }, [gameConfig?.mode, currentPlayer?.address, account?.address, isAITurn]);

    const canRoll = useMemo(() => {
        if (!gameState) return false;
        const phase = gameState.gamePhase;
        const canRollPhase = phase === 'ROLL_DICE' || phase === 'WAITING_FOR_ROLL';
        const result = canRollPhase && !isRolling && !isMoving && isLocalPlayerTurn;

        // Debug turn status in development
        if (result) console.log('🎲 [GoLudo] Local player can roll!');

        return result;
    }, [gameState?.gamePhase, isRolling, isMoving, isLocalPlayerTurn]);

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
        <div className="app aaa-layout">

            {/* 1. BOARD LAYER (Centered) */}
            <div className="board-layer">
                <Board rotation={boardRotation} activePlayer={gameState.activePlayer}>
                    {tokensWithCoords.map(({ playerIdx, tokenIdx, coords, inYard, stackIndex, stackSize }) => {
                        const isValid = gameState.validMoves.some(m => m.tokenIndex === tokenIdx);
                        const isHighlighted = isValid &&
                            playerIdx === gameState.activePlayer &&
                            (gameState.gamePhase === 'SELECT_TOKEN' || gameState.gamePhase === 'BONUS_MOVE') &&
                            !isAITurn;

                        return (
                            <Token
                                key={`${playerIdx}-${tokenIdx}`}
                                color={PLAYER_COLORS[playerIdx]}
                                row={coords.r}
                                col={coords.c}
                                onClick={isHighlighted ? () => handleTokenClick(playerIdx, tokenIdx) : null}
                                isHighlighted={isHighlighted}
                                isMoving={isMoving && isHighlighted}
                                inYard={inYard}
                                stackIndex={stackIndex}
                                stackSize={stackSize}
                                rotation={-boardRotation}
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
                </Board>
            </div>

            {/* 2. HUD LAYER (Overlay) */}
            <div className="game-hud">

                {/* Turn Timer - Top Center */}
                {gameState.gamePhase !== 'WIN' && turnTimer > 0 && (
                    <div className="turn-timer-container" style={{
                        position: 'absolute',
                        top: '15px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100,
                        pointerEvents: 'none'
                    }}>
                        <div className={`turn-timer ${turnTimer <= 10 ? 'urgent' : ''}`}>
                            ⏱️ {turnTimer}s
                        </div>
                    </div>
                )}

                {/* A. PLAYER POD CORNER ANCHORS */}
                <div className="player-pods-container">
                    {gameConfig.players.map((p, idx) => {
                        const visualPos = getVisualPositionIndex(idx);
                        const isActive = gameState.activePlayer === idx;
                        const color = PLAYER_COLORS[idx];
                        const isMe = gameConfig.mode === 'web3'
                            ? p.address?.toLowerCase() === account?.address?.toLowerCase()
                            : !p.isAI && idx === 0;
                        const canThisPlayerRoll = isActive && isLocalPlayerTurn && !isRolling && !isMoving &&
                            (gameState.gamePhase === 'ROLL_DICE' || gameState.gamePhase === 'WAITING_FOR_ROLL');
                        const displayName = p.name.length > 6 ? p.name.slice(0, 5) + '…' : p.name;

                        return (
                            <div key={idx} className={`pod-anchor pos-${visualPos}`}>
                                <div className={`player-pod ${color} ${isActive ? 'active' : ''}`}>
                                    <div className={`pod-avatar ${color}`}>
                                        {p.isAI ? '🤖' : '👤'}
                                        {isActive && <div className="pod-turn-indicator" />}
                                    </div>
                                    <span className="pod-name">{displayName}{isMe && ' •'}</span>
                                    {isActive && (
                                        <div className="pod-dice-container">
                                            <MiniDice
                                                value={gameState.diceValue}
                                                isActive={true}
                                                isRolling={isRolling}
                                                onClick={canThisPlayerRoll ? handleRoll : null}
                                                disabled={!canThisPlayerRoll}
                                                color={color}
                                            />
                                        </div>
                                    )}
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
                        playerName={gameConfig.players[gameState.winner]?.name}
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

                {/* D. BOTTOM CONTROLS (Commentator & Sports Ticker) */}
                <div className="bottom-controls">
                    <div className="sports-ticker">
                        <div className="ticker-content">
                            {BUILD_VERSION} • $GOLUDO MULTIPLAYER WEB3 • STAKE: {gameConfig.stake || 0} • ROOM: {gameConfig.roomId || 'LOCAL'} •
                            {BUILD_VERSION} • $GOLUDO MULTIPLAYER WEB3 • STAKE: {gameConfig.stake || 0} • ROOM: {gameConfig.roomId || 'LOCAL'} •
                        </div>
                    </div>
                    <Commentator />
                </div>

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
                            <button onClick={() => { handleToggleMute(); setMenuOpen(false); }}>
                                {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                            </button>
                            <button onClick={() => { setMenuOpen(false); handleBackToLobby(); }}>
                                🚪 Leave Game
                            </button>
                        </div>
                    )}
                </div>

                {/* Version Display */}
                <div style={{
                    position: 'fixed',
                    bottom: '5px',
                    left: '5px',
                    fontSize: '9px',
                    color: 'rgba(255,255,255,0.2)',
                    pointerEvents: 'none',
                    zIndex: 999
                }}>
                    {BUILD_VERSION}
                </div>
            </div>
        </div>
    );
}

export default App;
