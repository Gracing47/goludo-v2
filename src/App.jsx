/**
 * MAIN APP COMPONENT - GoLudo
 * 
 * Features:
 * - Lobby → Game flow
 * - Intelligent AI with priority-based decisions
 * - Token stacking for multiple tokens on same cell
 * - USA Standard Rules
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Lobby from './components/Lobby';
import Board from './components/Board';
import Token from './components/Token';
import Commentator from './components/Commentator';
import Dice from './components/Dice';
import { useLudoWeb3 } from './hooks/useLudoWeb3';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from './config/api';
import './App.css';

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
    const [appState, setAppState] = useState('lobby');
    const [gameConfig, setGameConfig] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);

    // Ref to prevent double AI actions
    const aiActionInProgress = useRef(false);

    // Board rotation for Web3 matches (local player always at bottom)
    const [boardRotation, setBoardRotation] = useState(0);

    // Web3 Hook
    const { account, handleClaimPayout } = useLudoWeb3();
    const [payoutProof, setPayoutProof] = useState(null);
    const [isClaiming, setIsClaiming] = useState(false);

    // Socket for Web3 sync
    const socketRef = useRef(null);
    const [serverMsg, setServerMsg] = useState(null);
    const [turnTimer, setTurnTimer] = useState(null); // Countdown timer in seconds
    const timerIntervalRef = useRef(null); // Store interval ID

    // Start game from lobby
    const handleStartGame = useCallback((config) => {
        setGameConfig(config);

        // Map config players to engine color indices
        // RED: 0, GREEN: 1, YELLOW: 2, BLUE: 3
        const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };

        // Active colors based on the players' selected colors
        // Note: config.players is already sliced to playerCount
        const activeColors = config.players.map(p => colorMap[p.color]);

        setGameState(createInitialState(config.playerCount, activeColors));
        setAppState('game');
        aiActionInProgress.current = false;

        // Calculate board rotation for Web3
        if (config.mode === 'web3' && account) {
            const myIdx = config.players.findIndex(p => p.address?.toLowerCase() === account.address?.toLowerCase());
            if (myIdx !== -1) {
                // We want the local player to be at the bottom-left (Index 3 usually)
                // Angle = (targetIndex - myIndex) * 90
                const angle = (3 - myIdx) * 90;
                setBoardRotation(angle);
            } else {
                setBoardRotation(0);
            }
        } else {
            setBoardRotation(0);
        }

        // Socket logic for Web3
        if (config.mode === 'web3') {
            const socket = io(SOCKET_URL);
            socketRef.current = socket;

            socket.on('connect', () => {
                // Identify self so server knows I am a human
                socket.emit('join_match', {
                    roomId: config.roomId,
                    playerAddress: account?.address
                });
            });

            socket.on('dice_rolled', ({ value, playerIndex }) => {
                setIsRolling(true);
                // Only clear if it was a normal turn roll, not a bonus message roll
                if (value !== 6) setServerMsg(null);

                setTimeout(() => {
                    // For Web3, we do NOT apply logic locally. We rely on state_update.
                    // This timeout just syncs the visual end of the animation with the state update arrival.
                    setIsRolling(false);
                }, 800);
            });

            socket.on('game_started', (room) => {
                console.log("🚀 Server says Game Started!");
                // Map config players to engine color indices
                const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
                const activeColors = room.players.map(p => colorMap[p.color]);

                setGameConfig({
                    mode: 'web3',
                    roomId: room.id,
                    stake: room.stake,
                    players: room.players.map(p => ({
                        name: p.name,
                        color: p.color,
                        address: p.address,
                        isAI: false
                    }))
                });

                setGameState(createInitialState(room.players.length, activeColors));
                setAppState('game');
                aiActionInProgress.current = false;

                // Set board rotation for creator too
                if (account) {
                    const myIdx = room.players.findIndex(p => p.address?.toLowerCase() === account.address?.toLowerCase());
                    if (myIdx !== -1) {
                        const angle = (3 - myIdx) * 90;
                        setBoardRotation(angle);
                    }
                }
            });

            socket.on('state_update', (update) => {
                if (update.msg) setServerMsg(update.msg);

                // FULL STATE SYNC: Trust the server engine completely
                // update contains { tokens, activePlayer, gamePhase, validMoves, diceValue, ... }
                setGameState(prev => ({
                    ...prev, // Keep any local UI flags if they exist (though we should clean them)
                    ...update, // Override with server truth
                    // Ensure UI mappings are correct
                    activePlayer: update.activePlayer,
                    gamePhase: update.gamePhase
                }));
            });


            // ============================================
            // AAA-LEVEL TURN TIMER LISTENERS
            // ============================================

            // Timer Start - Server initiates countdown
            socket.on('turn_timer_start', ({ playerIndex, timeoutMs, phase }) => {
                const timeoutSeconds = Math.floor(timeoutMs / 1000);
                setTurnTimer(timeoutSeconds);
                console.log(`⏰ Timer started: ${timeoutSeconds}s for Player ${playerIndex} (${phase})`);
            });

            // Timer Update - Server sends countdown updates every second
            socket.on('turn_timer_update', ({ playerIndex, remainingSeconds, phase }) => {
                setTurnTimer(remainingSeconds);

                // Visual feedback for urgent time
                if (remainingSeconds <= 3 && remainingSeconds > 0) {
                    console.log(`⚠️ Time running out: ${remainingSeconds}s`);
                }
            });

            // Timeout Event - Player ran out of time
            socket.on('turn_timeout', ({ playerIndex, playerName, phase }) => {
                setTurnTimer(0);
                setServerMsg(`⏰ ${playerName} timed out!`);
                console.log(`⏰ TIMEOUT: ${playerName} (Phase: ${phase})`);

                // Clear message after 3 seconds
                setTimeout(() => setServerMsg(null), 3000);
            });
        }
    }, [account]);

    // Return to lobby
    const handleBackToLobby = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setAppState('lobby');
        setGameState(null);
        setGameConfig(null);
        setPayoutProof(null);
        setIsRolling(false);
        setIsMoving(false);
        setTurnTimer(null);
        aiActionInProgress.current = false;
    }, []);

    // Roll dice
    const handleRoll = useCallback(() => {
        if (!gameState || gameState.gamePhase !== 'ROLL_DICE' || isRolling || isMoving) return;

        if (gameConfig?.mode === 'web3') {
            setIsRolling(true);
            socketRef.current?.emit('roll_dice', {
                roomId: gameConfig.roomId,
                playerAddress: account?.address
            });
            return;
        }

        setIsRolling(true);
        setTimeout(() => {
            setGameState(prev => rollDice(prev));
            setIsRolling(false);
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
            return () => clearTimeout(timer);
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

        if (gameState.validMoves.length === 0 && gameState.gamePhase !== 'ROLL_DICE') {
            aiActionInProgress.current = false;
        }
    }, [gameState, gameConfig, appState, isRolling, isMoving, handleRoll, executeMove]);

    // Web3 Payout Proof Handler
    useEffect(() => {
        if (appState === 'game' && gameState?.gamePhase === 'WIN' && gameConfig?.mode === 'web3' && !payoutProof) {
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
        if (!gameState) return [];

        // Group tokens by position to detect stacking
        const positionMap = new Map();

        gameState.tokens.forEach((playerTokens, playerIdx) => {
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
        if (!gameState || !gameConfig) return null;
        return gameConfig.players[gameState.activePlayer];
    }, [gameConfig?.players, gameState?.activePlayer]);

    const currentColor = useMemo(() => {
        if (!gameState) return null;
        return PLAYER_COLORS[gameState.activePlayer];
    }, [gameState?.activePlayer]);

    const isAITurn = useMemo(() =>
        currentPlayer?.isAI || false,
        [currentPlayer]
    );

    // Turn Logic for Web3 - MEMOIZED to prevent loop
    const isLocalPlayerTurn = useMemo(() => {
        if (!gameConfig || !currentPlayer) return false;
        if (gameConfig.mode === 'web3') {
            return currentPlayer?.address?.toLowerCase() === account?.address?.toLowerCase();
        }
        return !isAITurn;
    }, [gameConfig?.mode, currentPlayer?.address, account?.address, isAITurn]);

    const canRoll = useMemo(() => {
        if (!gameState) return false;
        return gameState.gamePhase === 'ROLL_DICE' && !isRolling && !isMoving && isLocalPlayerTurn;
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
    if (!gameState || !gameConfig) return null;

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
                <Board rotation={boardRotation}>
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
                        <div className={`dice-plate ${canRoll ? 'active-turn' : ''}`}>
                            <Dice
                                value={gameState.diceValue}
                                onRoll={handleRoll}
                                disabled={!canRoll}
                                isRolling={isRolling}
                            />
                        </div>
                    </div>

                    {/* Right: Menu */}
                    <div className="dock-right">
                        <button className="menu-btn" onClick={handleBackToLobby}>
                            ☰
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default App;
