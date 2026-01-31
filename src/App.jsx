/**
 * MAIN APP COMPONENT - GoLudo
 * Central game container managing state transitions, socket events, and engine integration.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameSocket } from './hooks/useGameSocket';
import { ethers } from 'ethers';
import Lobby from './components/Lobby';
import Board from './components/Board';
import Token from './components/Token';
import Dice from './components/Dice';

const BUILD_VERSION = "v4.3.4 - Web3 Socket Fix";
import CaptureExplosion from './components/CaptureExplosion';
import VictoryCelebration from './components/VictoryCelebration';
import { SpawnSparkle } from './components/ParticleEffects';
import { useGameVFX } from './hooks/useGameVFX';
import { useGameAI } from './hooks/useGameAI';
import { useLudoWeb3 } from './hooks/useLudoWeb3';
import { useNavigate, useParams } from 'react-router-dom';
import { API_URL, SOCKET_URL } from './config/api';

import WarpTransition from './components/WarpTransition';
import AAACountdown from './components/AAACountdown';


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
        state: gameState, setGameState,
        updateState, // Import updateState action
        isRolling, setIsRolling,
        isMoving, setIsMoving,
        activeMovingToken, setActiveMovingToken,
        boardRotation, setBoardRotation,
        serverMsg, setServerMsg,
        turnTimer, setTurnTimer,
        payoutProof, setPayoutProof,
        socket, setSocket,
        isShaking, setIsShaking,
        showCountdown, setShowCountdown,
        gameCountdown, setGameCountdown,
        isMuted, setIsMuted,
        reset: resetStore,
    } = useGameStore(useShallow((s) => ({
        appState: s.appState,
        setAppState: s.setAppState,
        config: s.config,
        setConfig: s.setConfig,
        state: s.state,
        setGameState: s.setGameState,
        updateState: s.updateState,
        isRolling: s.isRolling,
        setIsRolling: s.setIsRolling,
        isMoving: s.isMoving,
        setIsMoving: s.setIsMoving,
        activeMovingToken: s.activeMovingToken,
        setActiveMovingToken: s.setActiveMovingToken,
        boardRotation: s.boardRotation,
        setBoardRotation: s.setBoardRotation,
        serverMsg: s.serverMsg,
        setServerMsg: s.setServerMsg,
        turnTimer: s.turnTimer,
        setTurnTimer: s.setTurnTimer,
        payoutProof: s.payoutProof,
        setPayoutProof: s.setPayoutProof,
        isShaking: s.isShaking,
        setIsShaking: s.setIsShaking,
        showCountdown: s.showCountdown,
        setShowCountdown: s.setShowCountdown,
        gameCountdown: s.gameCountdown,
        setGameCountdown: s.setGameCountdown,
        isMuted: s.isMuted,
        setIsMuted: s.setIsMuted,
        reset: s.reset,
    })));

    // React Router hooks
    const navigate = useNavigate();
    const { roomId: gameId } = useParams();

    // Web3 Hooks
    const { account, handleClaimPayout } = useLudoWeb3();

    // Socket Hook
    const { socket: matchSocket, connect: socketConnect, emitRoll, emitMove } = useGameSocket(gameId, account);

    // Sync isRolling to ref for safety timeouts
    const isRollingRef = useRef(isRolling);
    useEffect(() => { isRollingRef.current = isRolling; }, [isRolling]);

    // Local state for claiming (not needed in global store)
    const [isClaiming, setIsClaiming] = useState(false);

    // VFX Hook
    const {
        captureEffects,
        spawnEffects,
        triggerCapture,
        triggerSpawn,
        playSound,
        triggerPenalty
    } = useGameVFX();

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

            // 🛡️ Rule: Always visually stack if multiple players are in the same cell
            // This ensures tokens are never hidden, even if safe zone logic fails or during transit
            const isSafePos = SAFE_POSITIONS.includes(firstGroup.position);
            const isYard = firstGroup.inYard;
            const isGoal = firstGroup.position === POSITION.FINISHED;
            const allowStacking = playerIndices.length > 1 || isSafePos || isYard || isGoal;

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

    // Moving token path state is now in useGameStore: activeMovingToken, setActiveMovingToken

    // Effect: Haptic feedback on rolling a 6
    useEffect(() => {
        if (gameState?.diceValue === 6 && !isRolling) {
            if (navigator.vibrate) {
                navigator.vibrate([10, 30, 10]);
            }
        }
    }, [gameState?.diceValue, isRolling]);


    // Menu Dropdown State
    const [menuOpen, setMenuOpen] = useState(false);

    // Sync Mute State with SoundManager
    useEffect(() => {
        // We import soundManager dynamically or just use the hook context if we refactored fully
        // But since SoundManager is a singleton, we can just access the global instance
        // via the useGameVFX hook or import it inside the effect if strictly needed.
        // Or better: Let's trust useGameVFX to handle this, OR refactor SoundManager to be a true singleton accessible locally without crash.
        // Actually, preventing the import at top level avoids the ReferenceError if the file execution order is wrong.
        // BUT, the ReferenceError was "ReferenceError: soundManager is not defined", which suggests it wasn't initialized.

        import('./services/SoundManager').then(module => {
            module.default.setMuted(isMuted);
        }).catch(err => console.warn("SoundManager sync failed", err));

    }, [isMuted]);

    const handleToggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, [setIsMuted]);

    const handleInteraction = useCallback(() => {
        playSound('bgm'); // Assuming we add a bgm case or handle it
        window.removeEventListener('click', handleInteraction);
    }, [playSound]);

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

        // Initialize state regardless of mode
        const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
        const activeColors = config.players?.map(p => p ? colorMap[p.color] : null).filter(c => c !== null) || [0, 1, 2, 3];

        setGameConfig(config);
        setGameState(createInitialState(4, activeColors));

        // Perspective rotation
        if (config.players?.[0]) {
            const humanColorIndex = colorMap[config.players[0].color];
            setBoardRotation((3 - humanColorIndex) * 90);
        }

        // Trigger Countdown for all modes (Web3 is now handled by socket hook)
        if (config.mode !== 'web3') {
            setGameCountdown(5);
            setShowCountdown(true);
        }

        if (config.mode === 'web3') {
            socketConnect();
        } else {
            console.log('🎮 Local mode: Initializing game transition...');
            // App state will switch to 'game' after countdown in the effect
        }
    }, [socketConnect, setGameConfig, setGameState, setShowCountdown, setGameCountdown, setBoardRotation]);

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
            const currentSocket = matchSocket;

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

    // 3. Countdown Ticker Hook (Local & AI ONLY)
    useEffect(() => {
        // Web3 mode countdown is handled by the server (countdown_tick)
        if (gameConfig?.mode === 'web3') return;

        if (showCountdown && gameCountdown > 0) {
            const timer = setTimeout(() => {
                setGameCountdown(gameCountdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (showCountdown && gameCountdown === 0) {
            // Countdown finished - reveal game
            setShowCountdown(false);
            if (appState !== 'game') {
                setAppState('game');
            }
        }
    }, [showCountdown, gameCountdown, appState, setGameCountdown, setShowCountdown, setAppState, gameConfig?.mode]);

    // Return to lobby
    const handleBackToLobby = useCallback(() => {
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
            const success = emitRoll();
            if (!success) {
                setServerMsg("📡 Reconnected! Try rolling again.");
                socketConnect();
                return;
            }
            setIsRolling(true);
            return;
        }

        setIsRolling(true);
        playSound('roll');
        setTimeout(() => {
            const newState = rollDice(gameState);
            setGameState(newState);
            setIsRolling(false);

            // Handle Triple-6 penalty
            if (newState.message && newState.message.includes('Triple 6')) {
                triggerPenalty();
                setServerMsg(newState.message);
                setTimeout(() => setServerMsg(null), 2500);
            }

            aiActionInProgress.current = false;
        }, 800);
    }, [gameState, isRolling, isMoving, gameConfig, playSound, triggerPenalty]);

    // Execute a move (for both human and AI)
    const executeMove = useCallback((move) => {
        if (!gameState || (gameState.gamePhase !== 'SELECT_TOKEN' && gameState.gamePhase !== 'BONUS_MOVE')) return;

        const isWeb3 = gameConfig?.mode === 'web3';
        const playerIdx = gameState.activePlayer;
        const tokenIdx = move.tokenIndex;
        const isBonus = gameState.gamePhase === 'BONUS_MOVE';
        const hasCapture = move.captures && move.captures.length > 0;
        const path = move.traversePath || [move.toPosition];
        const hopDuration = (isBonus || hasCapture) ? 60 : 150;

        // 🌟 Spawn Effect
        if (move.isSpawn) {
            playSound('spawn');
            const startPos = PLAYER_START_POSITIONS[playerIdx];
            const startCoords = MASTER_LOOP[startPos];
            if (startCoords) triggerSpawn(playerIdx, startCoords.r, startCoords.c);
        }

        // 🎬 START ANIMATION TRACKING
        setIsMoving(true);
        setActiveMovingToken({ playerIdx, tokenIdx, isBonus });

        // 🎬 STEP-BY-STEP ANIMATION LOOP
        path.forEach((pos, index) => {
            setTimeout(() => {
                setGameState(prev => {
                    const newTokens = prev.tokens.map(arr => [...arr]);
                    newTokens[playerIdx][tokenIdx] = pos;
                    playSound('move');
                    return { ...prev, tokens: newTokens };
                });
            }, index * hopDuration);
        });

        // 🏁 FINAL COMPLETION
        setTimeout(() => {
            if (isWeb3) {
                // Emit to server and let state_update handle the logic
                emitMove(tokenIdx);

                // Audio/Feedback
                if (hasCapture) {
                    playSound('capture');
                    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                } else if (move.isHome) playSound('home');
                else playSound('land');

                setIsMoving(false);
                setActiveMovingToken(null);
            } else {
                // Local/AI Mode Logic
                try {
                    setGameState(prev => {
                        const stateAfterMove = moveToken(prev, move);
                        const newState = completeMoveAnimation(stateAfterMove);

                        // Impact/Capture
                        if (hasCapture) {
                            playSound('capture');
                            const coords = MASTER_LOOP[move.toPosition] || (move.toPosition >= 100 ? HOME_STRETCH_COORDS[playerIdx][move.toPosition - 100] : null);
                            if (coords) triggerCapture(move.captures[0].player, coords.r, coords.c);
                        } else if (move.isHome) playSound('home');
                        else playSound('land');

                        if (newState.bonusMoves > 0) playSound('bonus');
                        return newState;
                    });
                } catch (e) {
                    console.error("Local move error:", e);
                } finally {
                    setIsMoving(false);
                    setActiveMovingToken(null);
                    aiActionInProgress.current = false;
                }
            }
        }, path.length * hopDuration + 100);
    }, [gameState, gameConfig, emitMove, playSound, triggerSpawn, triggerCapture]);

    // Human token click
    const handleTokenClick = useCallback((playerIndex, tokenIndex) => {
        if (!gameState || (gameState.gamePhase !== 'SELECT_TOKEN' && gameState.gamePhase !== 'BONUS_MOVE')) return;
        if (playerIndex !== gameState.activePlayer) return;

        // Check if it's AI's turn
        const currentPlayer = gameConfig?.players?.[gameState.activePlayer];
        if (currentPlayer?.isAI) return;

        const validMove = gameState.validMoves.find(m => m.tokenIndex === tokenIndex);
        if (!validMove) return;

        playSound('click');
        executeMove(validMove);
    }, [gameState, gameConfig, executeMove]);

    // AI Hook
    const { aiActionInProgress } = useGameAI(handleRoll, executeMove);


    // Reset game
    const handleReset = useCallback(() => {
        setGameState(createInitialState(gameConfig?.playerCount || 4));
        setIsRolling(false);
        setIsMoving(false);
        if (aiActionInProgress) aiActionInProgress.current = false;
    }, [gameConfig, setGameState, setIsRolling, setIsMoving, aiActionInProgress]);

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
            playSound('win');

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

    /**
     * Helper: Calculate visual rotation for player pods (0-3)
     * Adjusts the index based on the board's visual rotation so names match corners.
     */
    const getVisualPositionIndex = useCallback((rawIndex) => {
        // boardRotation is in degrees (0, 90, 180, 270)
        // Each 90 degrees shifts the perspective by 1 spot
        const rotationSteps = (boardRotation / 90) % 4;
        // Formula: (OriginalIndex + RotationSteps) % 4
        return (rawIndex + rotationSteps + 4) % 4;
    }, [boardRotation]);



    // ============================================
    // RENDER LOGIC
    // ============================================

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            {/* 0. PREMIUM COUNTDOWN LAYER */}
            {/* DEBUG: Check if countdown should show */}
            {console.log('🎯 Countdown Debug:', { showCountdown, gameCountdown, hasConfig: !!gameConfig, appState })}
            <AnimatePresence>
                {showCountdown && gameConfig && (
                    <AAACountdown
                        countdown={gameCountdown}
                        playerName={
                            gameConfig.mode === 'web3' && account
                                ? gameConfig.players?.find(p =>
                                    p?.address?.toLowerCase() === account.address?.toLowerCase()
                                )?.name
                                : gameConfig.players?.[0]?.name
                        }
                        playerColor={
                            gameConfig.mode === 'web3' && account
                                ? gameConfig.players?.find(p =>
                                    p?.address?.toLowerCase() === account.address?.toLowerCase()
                                )?.color
                                : gameConfig.players?.[0]?.color || 'cyan'
                        }
                    />
                )}
            </AnimatePresence>

            {/* 1. LOBBY VIEW */}
            {appState === 'lobby' && (
                <WarpTransition>
                    <div className="lobby-background">
                        <Lobby onStartGame={handleStartGame} />

                        {/* Audio Toggle (Lobby Overlay) */}
                        <div className="audio-control-lobby" onClick={handleToggleMute} style={{ position: 'fixed', top: 20, right: 20, cursor: 'pointer', zIndex: 100 }}>
                            {isMuted ? '🔇' : '🔊'}
                        </div>

                        {/* Version Overlay */}
                        <div className="version-tag" style={{ position: 'fixed', bottom: 5, right: 5, opacity: 0.3, fontSize: 10 }}>{BUILD_VERSION}</div>
                    </div>
                </WarpTransition>
            )}

            {/* 2. LOADING VIEW */}
            {appState === 'game' && (!gameState || !gameConfig) && (
                <WarpTransition mode={gameConfig?.mode === 'web3' ? 'literal' : 'subtle'}>
                    <div className="app-loading" style={{ background: 'transparent' }}>
                        <div className="loading-spinner">↻</div>
                        <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '2px' }}>
                            Establishing Connection...
                        </p>
                        <div className="loading-debug-info">
                            <p>Room: {gameId?.substring(0, 10)}...</p>
                            <p>Socket: {socketRef?.current?.connected ? '✅ Connected' : '⏳ Connecting...'}</p>
                            <p>State: {gameState ? '✅' : '❌'} | Config: {gameConfig ? '✅' : '❌'}</p>
                        </div>
                        <button className="btn-secondary" onClick={handleBackToLobby} style={{ marginTop: 20 }}>
                            Return to Lobby
                        </button>
                    </div>
                </WarpTransition>
            )}

            {/* 3. GAME VIEW */}
            {appState === 'game' && gameState && gameConfig && (
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
                                        x: (effect.col + 0.5) * (100 / 15) + '%',
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
                            <div className="turn-timer-container">
                                <div className={`turn-timer ${turnTimer <= 10 ? 'urgent' : ''}`}>
                                    ⏱️ {turnTimer}s
                                </div>
                            </div>
                        )}

                        {/* A. PLAYER POD CORNER ANCHORS */}
                        <div className="player-pods-container">
                            {gameConfig.players.map((p, idx) => {
                                if (!p) return null;
                                const visualPos = getVisualPositionIndex(idx);
                                const isActive = gameState.activePlayer === idx;
                                const color = PLAYER_COLORS[idx];
                                const isMe = gameConfig.mode === 'web3'
                                    ? p.address?.toLowerCase() === account?.address?.toLowerCase()
                                    : !p.isAI && idx === 0;

                                // NEW: Get skip/forfeit data from state
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

                        {/* B. SERVER MESSAGE TOAST */}
                        {serverMsg && <div className="server-toast">🔔 {serverMsg}</div>}

                        {/* C. WIN SCREEN */}
                        {gameState.gamePhase === 'WIN' && (
                            <VictoryCelebration
                                winner={gameState.winner}
                                playerName={gameConfig.players[gameState.winner]?.name || `Player ${gameState.winner + 1}`}
                                isWeb3Match={gameConfig.mode === 'web3'}
                                onClose={handleBackToLobby}
                            />
                        )}

                        {/* Web3 Claim Button */}
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

                        {/* D. CENTRAL DICE */}
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
                    </div>
                </div>
            )}

            {/* 4. CHAT/SOCIAL OVERLAY (Future) */}
        </div>
    );
}

export default App;
