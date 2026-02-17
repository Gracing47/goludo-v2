/**
 * MAIN APP COMPONENT - GoLudo
 * Central game container managing state transitions, socket events, and engine integration.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameSocket } from './hooks/useGameSocket';
import { ethers } from 'ethers';
import Board from './components/Board';

const BUILD_VERSION = "v4.4.6 - Code Quality Cleanup";
import { useGameVFX } from './hooks/useGameVFX';
import { useGameAI } from './hooks/useGameAI';
import { useLudoWeb3 } from './hooks/useLudoWeb3';
import { useNavigate, useParams } from 'react-router-dom';
import { API_URL, SOCKET_URL } from './config/api';

import WarpTransition from './components/WarpTransition';
import Dice from './components/Dice';
// import DiceArea from './components/DiceArea'; // Reverted to legacy Dice
import AmbientLight from './components/VFX/AmbientLight';
import VictoryCelebration from './components/VictoryCelebration';
import AAACountdown from './components/AAACountdown';
import soundManager from './services/SoundManager';


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

import { useGameStateDerivation } from './hooks/useGameStateDerivation';
import GameHUD from './components/HUD/GameHUD';
import Token from './components/Token';
import { CaptureExplosion, SpawnSparkle } from './components/ParticleEffects';

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
    const { socket: matchSocket, isConnected, connect: socketConnect, emitRoll, emitMove } = useGameSocket(gameId, account);

    // Sync isRolling to ref for safety timeouts
    const isRollingRef = useRef(isRolling);
    useEffect(() => { isRollingRef.current = isRolling; }, [isRolling]);

    // Local state for claiming (not needed in global store)
    const [isClaiming, setIsClaiming] = useState(false);
    const [isClaimed, setIsClaimed] = useState(false);

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
    // DATA DERIVATION (Extracted to Hook)
    // ============================================
    const {
        tokensWithCoords,
        currentPlayer,
        currentColor,
        isAITurn,
        isLocalPlayerTurn,
        canRoll
    } = useGameStateDerivation(account);

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
        soundManager.setMuted(isMuted);
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


    // 1. Web3 Connection Hook
    useEffect(() => {
        const roomId = gameId;
        if (!roomId || appState !== 'game' || gameConfig?.mode !== 'web3') return;

        // Ensure we have a socket connection
        if (roomId.length > 20 || gameConfig?.mode === 'web3') {
            const targetAddr = account?.address || 'anonymous';
            const currentSocket = matchSocket;

            const isMatchingSocket = currentSocket &&
                currentSocket._targetRoom === roomId &&
                currentSocket._targetAddr === targetAddr;

            if (!isMatchingSocket && account?.address) {
                console.log('🌐 Web3 Session: Initializing connection...', { roomId, account: targetAddr });

                // Initialize config if missing (e.g. on direct reload)
                if (!gameConfig) {
                    setGameConfig({ mode: 'web3', roomId: roomId });
                }

                socketConnect();
            }
        }
    }, [gameId, appState, gameConfig, socketConnect, account?.address, setGameConfig]);

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

    // Roll dice with visual delay
    const handleRoll = useCallback(() => {
        if (!gameState || isRolling || isMoving) return;
        const phase = gameState.gamePhase;
        if (phase !== 'ROLL_DICE' && phase !== 'WAITING_FOR_ROLL') return;

        setIsRolling(true);
        playSound('roll');

        // Combined Delay: 1000ms for "Juice"
        setTimeout(() => {
            if (gameConfig?.mode === 'web3') {
                const success = emitRoll();
                // Note: isRolling will be set to false when backend sends 'diceRolled' event
                if (!success) {
                    setServerMsg("📡 Reconnected! Try rolling again.");
                    socketConnect();
                    setIsRolling(false);
                }
            } else {
                // Local Mode
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
            }
        }, 1000);
    }, [gameState, isRolling, isMoving, gameConfig, playSound, triggerPenalty, emitRoll, socketConnect]);

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
        setIsClaimed(false); // Reset claim status
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

    // Web3 Payout Proof Handler (Sound now handled by VictoryCelebration)
    useEffect(() => {
        if (appState === 'game' && gameState?.gamePhase === 'WIN') {

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
            setIsClaimed(true); // Mark as claimed!
            playSound('success');
        } catch (err) {
            console.error(err);
            alert("Claim failed: " + (err.message || "Unknown error"));
        } finally {
            setIsClaiming(false);
        }
    }, [payoutProof, isClaiming, handleClaimPayout]);




    // ============================================
    // RENDER LOGIC
    // ============================================

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

            {/* 1. LOBBY VIEW - Handled by LudoLobby.tsx in the new routing system */}
            {appState === 'lobby' && (
                <WarpTransition>
                    <div className="lobby-background">
                        <div className="app-loading">
                            <p>Redirecting to Lobby...</p>
                            <button className="btn-secondary" onClick={() => navigate('/lobby')}>
                                Go to Lobby
                            </button>
                        </div>
                    </div>
                </WarpTransition>
            )}

            {/* 2. LOADING VIEW (Connection / Sync) */}
            {appState === 'game' && (!gameState || !gameConfig || !gameConfig.players) && (
                <WarpTransition mode={gameConfig?.mode === 'web3' ? 'literal' : 'subtle'}>
                    <div className="app-loading" style={{ background: 'transparent' }}>
                        <div className="loading-content">
                            <div className="loading-spinner">↻</div>
                            <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: '4px', textTransform: 'uppercase' }}>
                                {gameConfig?.mode === 'web3' ? 'Establishing Connection' : 'Preparing Match'}
                            </h2>
                            <p className="loading-subtitle">
                                {gameConfig?.mode === 'web3' ? 'Synchronizing with the Flare Network...' : 'Loading game assets...'}
                            </p>
                        </div>

                        <div className="loading-debug-info">
                            <div className="debug-item">
                                <span className="debug-label">Room ID</span>
                                <span className="debug-value">{gameId?.substring(0, 10)}...</span>
                            </div>
                            <div className="debug-item">
                                <span className="debug-label">Socket</span>
                                <span className={`debug-status ${socket?.connected ? 'active' : 'waiting'}`}>
                                    {socket?.connected ? 'CONNECTED' : 'CONNECTING...'}
                                </span>
                            </div>
                            <div className="debug-item">
                                <span className="debug-label">Game Engine</span>
                                <span className={`debug-status ${gameState ? 'active' : 'waiting'}`}>
                                    {gameState ? 'INITIALIZED' : 'WAITING FOR DATA...'}
                                </span>
                            </div>
                        </div>

                        <button className="btn-secondary" onClick={handleBackToLobby} style={{ marginTop: 40, padding: '12px 24px', borderRadius: '30px' }}>
                            Leave & Return to Lobby
                        </button>
                    </div>
                </WarpTransition>
            )}

            {/* 3. GAME VIEW (Render board once data is ready) */}
            {appState === 'game' && gameState && gameConfig?.players && (
                <div className={`app aaa-layout ${isShaking ? 'shake-active' : ''}`}>

                    {/* 0. AMBIENT LIGHTING (Underlay) */}
                    <AmbientLight activePlayer={gameState.activePlayer} />

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
                                    position={{
                                        x: (effect.col + 0.5) * (100 / 15) + '%',
                                        y: (effect.row + 0.5) * (100 / 15) + '%'
                                    }}
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
                    <GameHUD
                        gameState={gameState}
                        gameConfig={gameConfig}
                        account={account}
                        turnTimer={turnTimer}
                        boardRotation={boardRotation}
                        isConnected={isConnected}
                        appState={appState}
                    />

                    {/* 3. GLOBAL UI (Pot & Dice - Moved out of Board for cleanup) */}
                    {gameConfig.mode === 'web3' && gameConfig.stake && gameState.gamePhase !== 'WIN' && gameState.gamePhase !== 'GAME_OVER' && (
                        <div className="pot-display">
                            <span className="pot-icon">💰</span>
                            <div className="pot-info" style={{ display: 'flex', alignItems: 'baseline' }}>
                                <span className="pot-amount">
                                    {(parseFloat(gameConfig.stake) * gameConfig.playerCount).toFixed(1)}
                                </span>
                                <span className="pot-currency">C2FLR</span>
                            </div>
                        </div>
                    )}

                    {gameState.gamePhase !== 'WIN' && gameState.gamePhase !== 'GAME_OVER' && (
                        <div className="central-dice-area">
                            <Dice
                                value={gameState.diceValue}
                                onRoll={handleRoll}
                                disabled={!canRoll}
                                isRolling={isRolling}
                                color={
                                    gameConfig.mode === 'web3' && account
                                        ? PLAYER_COLORS[gameState.activePlayer] // Web3: Active Player Color
                                        : PLAYER_COLORS[gameState.activePlayer] // Classic: Active Player Color
                                }
                            />
                        </div>
                    )}
                </div>
            )}

            {/* A. COUNTDOWN OVERLAY */}
            <AnimatePresence>
                {showCountdown && (
                    <AAACountdown
                        countdown={gameCountdown}
                        players={gameConfig?.players?.map((p, i) => ({
                            name: p.name || `Player ${i + 1}`,
                            color: PLAYER_COLORS[i]
                        })) || PLAYER_COLORS.map((c, i) => ({ name: `Player ${i + 1}`, color: c }))}
                    />
                )}
            </AnimatePresence>

            {/* B. SERVER MESSAGE TOAST */}
            {serverMsg && <div className="server-toast">🔔 {serverMsg}</div>}

            {/* C. WIN SCREEN */}
            {gameState.gamePhase === 'WIN' && (() => {
                // Determine if current player is the winner
                const winnerPlayer = gameConfig.players[gameState.winner] || { name: `Player ${gameState.winner + 1}`, isAI: false, address: '' };
                const amIWinner = gameConfig.mode === 'web3'
                    ? winnerPlayer?.address?.toLowerCase() === account?.address?.toLowerCase()
                    : !winnerPlayer?.isAI; // In local, human player is always "you"

                // Calculate pot amount for display
                const potDisplay = gameConfig.mode === 'web3' && gameConfig.stake
                    ? (parseFloat(gameConfig.stake) * gameConfig.playerCount).toFixed(2)
                    : null;

                return (
                    <VictoryCelebration
                        winner={gameState.winner}
                        playerName={winnerPlayer?.name || `Player ${gameState.winner + 1}`}
                        isWeb3Match={gameConfig.mode === 'web3'}
                        isWinner={amIWinner}
                        payoutProof={payoutProof}
                        isClaiming={isClaiming}
                        isClaimed={isClaimed}
                        onClaim={onClaimClick}
                        onClose={handleBackToLobby}
                        potAmount={potDisplay}
                    />
                );
            })()}

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
                        <button onClick={() => { setMenuOpen(false); handleBackToLobby(); }}>
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
    );
}

export default App;
