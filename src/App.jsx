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
import Dice from './components/Dice';
import CaptureExplosion from './components/CaptureExplosion';
import soundManager from './services/SoundManager';
import { useLudoWeb3 } from './hooks/useLudoWeb3';
import { useNavigate, useParams } from 'react-router-dom';
import { API_URL, SOCKET_URL } from './config/api';
import './App.css';

// Zustand Store
import { useGameStore } from './store/useGameStore';
import { useShallow } from 'zustand/shallow';

import {
    PLAYER_COLORS,
    MASTER_LOOP,
    HOME_STRETCH_COORDS,
    YARD_COORDS,
    POSITION
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

    // Sound Mute State
    const [isMuted, setIsMuted] = useState(soundManager.isMuted());

    // Menu Dropdown State
    const [menuOpen, setMenuOpen] = useState(false);

    const handleToggleMute = useCallback(() => {
        const newMuted = soundManager.toggleMute();
        setIsMuted(newMuted);
    }, []);

    // Initialize Audio (BGM)
    useEffect(() => {
        // Attempt to play BGM (might require interaction)
        const handleInteraction = () => {
            if (!soundManager.isMuted()) {
                soundManager.playBGM();
            }
            window.removeEventListener('click', handleInteraction);
        };
        window.addEventListener('click', handleInteraction);
        return () => window.removeEventListener('click', handleInteraction);
    }, []);

    // ============================================
    // GAME START LOGIC (Refactored from handleStartGame)
    // ============================================
    const onGameStart = useCallback((config) => {
        aiActionInProgress.current = false;

        if (config.mode === 'web3') {
            // Cleanup existing socket if any
            if (socketRef.current) {
                socketRef.current.disconnect();
            }

            console.log('🌐 Web3 Match: Connecting to socket...');
            aiActionInProgress.current = false;

            const socket = io(SOCKET_URL, {
                query: { roomId: config.roomId, userAddress: account?.address || 'anonymous' }
            });

            socketRef.current = socket;
            setSocket(socket);

            socket.on('connect', () => {
                socket.emit('join_match', {
                    roomId: config.roomId,
                    playerAddress: account?.address
                });
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
                setTurnTimer(Math.floor(timeoutMs / 1000));
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
        }

        // ============================================
        // LOCAL/AI MODE: Initialize immediately
        // ============================================
        console.log('🎮 Local mode: Initializing game...');

        setGameConfig(config);

        const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
        const activeColors = config.players.map(p => colorMap[p.color]);

        setGameState(createInitialState(config.playerCount, activeColors));
        setAppState('game');
        setBoardRotation(0);
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
    // 1. Persistence Hook: Re-entry (Lobby -> Game)
    useEffect(() => {
        if (gameId && appState === 'lobby') {
            const savedData = localStorage.getItem(`ludo_game_${gameId}`);
            if (savedData) {
                try {
                    const { config, state } = JSON.parse(savedData);
                    setGameConfig(config);
                    setGameState(state);
                    setAppState('game');
                } catch (e) {
                    console.warn("Failed to resume game", e);
                }
            } else if (gameId.length > 20 && !socketRef.current) {
                // Potential Web3 room ID: Only connect if not already connected
                onGameStart({ mode: 'web3', roomId: gameId });
            }
        }
    }, [gameId, appState, onGameStart]);

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
        if (!gameState || gameState.gamePhase !== 'ROLL_DICE' || isRolling || isMoving) return;

        if (gameConfig?.mode === 'web3') {
            setIsRolling(true);
            socketRef.current?.emit('roll_dice', {
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
            setGameState(prev => rollDice(prev));
            setIsRolling(false);
            aiActionInProgress.current = false; // Reset lock so AI can proceed (select token or next turn)
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

        // 💥 Capture Explosion: Trigger if this move has captures
        if (move.captures && move.captures.length > 0) {
            // Get coordinates for the destination (where capture happens)
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
        }

        setIsMoving(true);
        setGameState(prev => moveToken(prev, move));

        setTimeout(() => {
            setGameState(prev => completeMoveAnimation(prev));
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
    const tokensWithCoords = useMemo(() => {
        if (!gameState) return [];
        return getTokensWithCoords();
    }, [gameState?.tokens]); // Don't include getTokensWithCoords - it changes every render!

    const currentPlayer = useMemo(() => {
        if (!gameState || !gameConfig || !gameConfig.players) return null;
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
        // Need config to determine mode
        if (!gameConfig) return false;

        // For Web3 mode: compare addresses
        if (gameConfig.mode === 'web3') {
            if (!currentPlayer || !account?.address) {
                console.log('🎯 Turn: No player/account', { currentPlayer, hasAccount: !!account });
                return false;
            }
            const currentAddr = currentPlayer?.address?.toLowerCase();
            const myAddr = account.address.toLowerCase();
            const isMyTurn = currentAddr === myAddr;
            console.log('🎯 Turn:', { activePlayer: gameState?.activePlayer, currentAddr, myAddr, isMyTurn });
            return isMyTurn;
        }

        // For Local/AI mode: human can always play (when not AI turn)
        return !isAITurn;
    }, [gameConfig?.mode, currentPlayer?.address, account?.address, isAITurn, gameState?.activePlayer]);

    const canRoll = useMemo(() => {
        if (!gameState) return false;
        const phase = gameState.gamePhase;
        const canRollPhase = phase === 'ROLL_DICE' || phase === 'WAITING_FOR_ROLL';
        const result = canRollPhase && !isRolling && !isMoving && isLocalPlayerTurn;
        console.log('🎲 canRoll:', { phase, isLocalPlayerTurn, result });
        return result;
    }, [gameState?.gamePhase, isRolling, isMoving, isLocalPlayerTurn]);

    // Render lobby
    if (appState === 'lobby') {
        return (
            <div className="app">
                <Lobby onStartGame={handleStartGame} />
            </div>
        );
    }

    // Render game
    if (!gameState || !gameConfig) {
        return (
            <div className="app-loading">
                <div className="loading-spinner">↻</div>
                <p>Loading Game State...</p>
                {/* Debug info in case it gets stuck */}
                <small style={{ opacity: 0.5, fontSize: 10 }}>
                    State: {gameState ? 'OK' : 'MISSING'} | Config: {gameConfig ? 'OK' : 'MISSING'}
                </small>
                <button onClick={handleBackToLobby} style={{ marginTop: 20 }}>
                    Return to Lobby
                </button>
            </div>
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
                </Board>
            </div>

            {/* 2. HUD LAYER (Overlay) */}
            <div className="game-hud">

                {/* A. CORNER AVATARS */}
                {gameConfig.players.map((p, idx) => {
                    const isActive = gameState.activePlayer === idx;
                    const color = PLAYER_COLORS[idx];
                    const visualPos = getVisualPositionIndex(idx);
                    const isMe = gameConfig.mode === 'web3'
                        ? p.address?.toLowerCase() === account?.address?.toLowerCase()
                        : !p.isAI && idx === 0;

                    return (
                        <div key={idx} className={`player-corner pos-${visualPos} ${isActive ? 'active' : ''}`}>
                            <div className={`avatar-ring ${color}`} style={{ color: `var(--color-${color})` }}>
                                {p.isAI ? '🤖' : '👤'}
                                {isActive && <div className="turn-ripple" />}
                            </div>
                            <div className="player-info">
                                <span className="p-name">
                                    {p.name}{isMe && ' (You)'}
                                </span>
                                {isActive && (
                                    <span className="p-status">
                                        {isRolling ? 'Rolling...' : isMoving ? 'Moving...' : 'Thinking...'}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* B. SERVER MESSAGE TOAST */}
                {serverMsg && <div className="server-toast">🔔 {serverMsg}</div>}

                {/* C. WIN SCREEN (Modal) */}
                {gameState.gamePhase === 'WIN' && (
                    <div className="modal-overlay">
                        <div className="win-card">
                            <h1>🏆 VICTORY!</h1>
                            <p>{gameConfig.players[gameState.winner]?.name} wins the match!</p>

                            {gameConfig.mode === 'web3' && (
                                <div style={{ margin: '20px 0' }}>
                                    {payoutProof ? (
                                        <button className="btn-primary" onClick={onClaimClick} disabled={isClaiming}>
                                            {isClaiming ? 'Claiming...' : '💰 Claim Payout'}
                                        </button>
                                    ) : (
                                        <p style={{ color: '#00f3ff' }}>Verifying on Blockchain... ⏳</p>
                                    )}
                                </div>
                            )}

                            <button className="btn-secondary" onClick={handleBackToLobby}>
                                Back to Menu
                            </button>
                        </div>
                    </div>
                )}

                {/* D. BOTTOM DOCK (Controls) */}
                <div className="bottom-dock">

                    {/* Left: Timer */}
                    <div className="dock-left">
                        {turnTimer !== null && turnTimer > 0 && (
                            <div className={`turn-timer ${turnTimer <= 5 ? 'urgent' : ''}`}>
                                ⏱ {turnTimer}s
                            </div>
                        )}
                    </div>

                    {/* Center: Dice & Ticker */}
                    <div className="dock-center">
                        <div className="game-ticker">{getTickerText()}</div>
                        <Dice
                            value={gameState.diceValue}
                            onRoll={handleRoll}
                            disabled={!canRoll}
                            isRolling={isRolling}
                        />
                    </div>

                    {/* Right: Menu */}
                    <div className="dock-right">
                        <div className="menu-dropdown-container">
                            <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
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
                    </div>
                </div>

            </div>
        </div>
    );
}

export default App;
