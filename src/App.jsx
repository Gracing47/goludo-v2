/**
 * MAIN APP COMPONENT
 * 
 * GoLudo - Classic Board Game
 * Horizontal layout: Board | Sidebar (controls)
 */

import React, { useState } from 'react';
import Board from './components/Board';
import Token from './components/Token';
import Dice from './components/Dice';
import './App.css';

import {
    PLAYER_COLORS,
    PLAYER_NAMES,
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

function App() {
    const [gameState, setGameState] = useState(createInitialState());
    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);

    const handleRoll = () => {
        if (gameState.gamePhase !== 'ROLL_DICE' || isRolling || isMoving) return;

        setIsRolling(true);
        setTimeout(() => {
            setGameState(rollDice(gameState));
            setIsRolling(false);
        }, 800);
    };

    const handleTokenClick = (playerIndex, tokenIndex) => {
        if (gameState.gamePhase !== 'SELECT_TOKEN') return;
        if (playerIndex !== gameState.activePlayer) return;

        const validMove = gameState.validMoves.find(m => m.tokenIndex === tokenIndex);
        if (!validMove) return;

        setIsMoving(true);
        const newState = moveToken(gameState, validMove);
        setGameState(newState);

        setTimeout(() => {
            setGameState(completeMoveAnimation(newState));
            setIsMoving(false);
        }, 400);
    };

    const handleReset = () => {
        setGameState(createInitialState());
        setIsRolling(false);
        setIsMoving(false);
    };

    const getTokenCoords = (playerIndex, tokenIndex, position) => {
        if (position === POSITION.IN_YARD) {
            return { ...YARD_COORDS[playerIndex][tokenIndex], inYard: true };
        }

        if (position === POSITION.FINISHED) {
            const offsets = [{ r: 6, c: 6 }, { r: 6, c: 8 }, { r: 8, c: 6 }, { r: 8, c: 8 }];
            return { ...offsets[tokenIndex % 4], inYard: false };
        }

        if (position >= 100 && position < 106) {
            return { ...HOME_STRETCH_COORDS[playerIndex][position - 100], inYard: false };
        }

        if (position >= 0 && position < MASTER_LOOP.length) {
            return { ...MASTER_LOOP[position], inYard: false };
        }

        return null;
    };

    const currentPlayer = PLAYER_NAMES[gameState.activePlayer];
    const currentColor = PLAYER_COLORS[gameState.activePlayer];
    const canRoll = gameState.gamePhase === 'ROLL_DICE' && !isRolling && !isMoving;

    return (
        <div className="app">
            <div className="game-container">
                <Board>
                    {gameState.tokens.flatMap((playerTokens, playerIdx) =>
                        playerTokens.map((position, tokenIdx) => {
                            const coords = getTokenCoords(playerIdx, tokenIdx, position);
                            if (!coords) return null;

                            const isValid = gameState.validMoves.some(m => m.tokenIndex === tokenIdx);
                            const isHighlighted = isValid &&
                                playerIdx === gameState.activePlayer &&
                                gameState.gamePhase === 'SELECT_TOKEN';

                            return (
                                <Token
                                    key={`${playerIdx}-${tokenIdx}`}
                                    color={PLAYER_COLORS[playerIdx]}
                                    row={coords.r}
                                    col={coords.c}
                                    onClick={isHighlighted ? () => handleTokenClick(playerIdx, tokenIdx) : null}
                                    isHighlighted={isHighlighted}
                                    isMoving={isMoving && isHighlighted}
                                    inYard={coords.inYard}
                                />
                            );
                        })
                    )}
                </Board>

                <div className="game-sidebar">
                    <header className="game-header">
                        <h1 className="game-title">GoLudo</h1>
                        <p className="game-subtitle">Classic Board Game</p>
                    </header>

                    <div className={`player-info player-${currentColor}`}>
                        <div className="player-indicator" />
                        <span className="player-name">{currentPlayer}'s Turn</span>
                    </div>

                    <Dice
                        value={gameState.diceValue}
                        onRoll={handleRoll}
                        disabled={!canRoll}
                        isRolling={isRolling}
                    />

                    <div className="game-status">
                        {gameState.gamePhase === 'WIN' ? (
                            <div className="win-message">
                                <h2>🎉 {PLAYER_NAMES[gameState.winner]} Wins!</h2>
                                <button className="reset-button" onClick={handleReset}>
                                    Play Again
                                </button>
                            </div>
                        ) : (
                            <p>
                                {isRolling ? 'Rolling...' :
                                    gameState.gamePhase === 'ROLL_DICE' ? 'Click dice to roll' :
                                        gameState.validMoves.length > 0 ? 'Select a token' : 'No moves...'}
                            </p>
                        )}
                    </div>

                    {gameState.gamePhase !== 'WIN' && (
                        <button className="reset-button-small" onClick={handleReset}>
                            New Game
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
