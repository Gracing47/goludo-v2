/**
 * Game Page - Active Game Screen
 * 
 * Main gameplay screen with board, dice, and controls.
 * Integrates game state from store.
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import { useGameStore } from '../store/useGameStore';
import { Board } from '../components/game/Board';
import { Dice } from '../components/game/Dice';
import { Button } from '../components/common/Button';
import './GamePage.css';

export const GamePage = () => {
    const navigate = useNavigate();
    const { gameId } = useParams<{ gameId: string }>();

    // Get state from store
    const gameState = useGameStore((state) => state.state);
    const setState = useGameStore((state) => state.setState);

    // Temporary: Inject test data to see tokens on board
    useEffect(() => {
        // Only inject if no game state exists
        if (!gameState) {
            console.log('🎮 Injecting test game state...');

            setState({
                activePlayer: 0,
                gamePhase: 'ROLL_DICE',
                diceValue: null,
                tokens: [
                    // Red (Player 0): 1 in yard, 1 at start, 1 mid-path, 1 near end
                    [-1, 0, 10, 50],

                    // Green (Player 1): All in yard
                    [-1, -1, -1, -1],

                    // Yellow (Player 2): All in yard
                    [-1, -1, -1, -1],

                    // Blue (Player 3): All in yard
                    [-1, -1, -1, -1]
                ],
                validMoves: [],
                consecutiveSixes: 0,
                bonusMoves: 0,
                activeColors: [0, 1, 2, 3],
                winner: null,
                message: 'Test game - Red has tokens on board'
            });
        }
    }, [gameState, setState]);

    // Temporary state for dice
    const diceValue = gameState?.diceValue || 4;
    const isRolling = false;

    const handleRoll = () => {
        console.log('🎲 Rolling dice...');
    };

    return (
        <div className="game-page">
            <div className="game-container">
                {/* Header */}
                <header className="game-header">
                    <div className="game-info">
                        <h1 className="game-title">Game In Progress</h1>
                        <p className="game-id">Game ID: {gameId}</p>
                        {gameState && (
                            <p className="game-status-text">{gameState.message}</p>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(ROUTES.HOME)}
                    >
                        ← Exit
                    </Button>
                </header>

                {/* Board Section */}
                <div className="board-section">
                    <Board />
                </div>

                {/* Controls Section */}
                <div className="controls-section">
                    <div className="dice-container">
                        <Dice
                            value={diceValue}
                            isRolling={isRolling}
                            onClick={handleRoll}
                            playerColor="#ef4444"
                        />
                    </div>

                    <div className="game-status">
                        <p className="status-text">
                            {gameState ? `Player ${gameState.activePlayer + 1}'s Turn` : 'Loading...'}
                        </p>
                        <p className="status-hint">
                            {gameState?.gamePhase === 'ROLL_DICE' ? 'Roll the dice to move' : 'Select a token'}
                        </p>
                    </div>
                </div>

                {/* Debug Info - Commented out to save space */}
                {/* {import.meta.env.DEV && gameState && (
          <div className="debug-panel">
            <h3>Debug Info</h3>
            <pre>{JSON.stringify({
              activePlayer: gameState.activePlayer,
              phase: gameState.gamePhase,
              dice: gameState.diceValue,
              tokens: gameState.tokens
            }, null, 2)}</pre>
          </div>
        )} */}
            </div>
        </div>
    );
};

export default GamePage;
