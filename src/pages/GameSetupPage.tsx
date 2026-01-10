/**
 * Game Setup Page
 * 
 * Player configuration screen for local and AI games.
 * Integrates with Zustand store for state management.
 * 
 * Features:
 * - Player name editing
 * - Color selection with conflict detection
 * - Human/AI toggle
 * - Add/remove players (2-4)
 * - Store synchronization
 * - Navigation to game
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLobbyStore } from '../store/useLobbyStore';
import { PlayerSetupCard } from '../components/lobby/PlayerSetupCard';
import { Button } from '../components/common/Button';
import { ROUTES } from '../config/routes';
import type { PlayerColor } from '../types';
import './GameSetupPage.css';

export const GameSetupPage = () => {
    const navigate = useNavigate();
    const { mode } = useParams<{ mode: string }>();

    // Store Hooks
    const players = useLobbyStore((state) => state.players);
    const playerCount = useLobbyStore((state) => state.playerCount);
    const updatePlayer = useLobbyStore((state) => state.updatePlayer);
    const setPlayerCount = useLobbyStore((state) => state.setPlayerCount);
    const setGameMode = useLobbyStore((state) => state.setGameMode);

    // Sync URL mode to store
    useEffect(() => {
        if (mode) {
            setGameMode(mode as any);
        }
    }, [mode, setGameMode]);

    // Calculate taken colors for conflict detection
    const takenColors: PlayerColor[] = players.slice(0, playerCount).map(p => p.color);

    /**
     * Add a new player (up to 4)
     */
    const handleAddPlayer = () => {
        if (playerCount < 4) {
            setPlayerCount(playerCount + 1);
        }
    };

    /**
     * Remove a player (minimum 2)
     */
    const handleRemovePlayer = (index: number) => {
        if (playerCount > 2) {
            setPlayerCount(playerCount - 1);
        }
    };

    /**
     * Start the game
     * Generates a local game ID and navigates to game page
     */
    const handleStartGame = () => {
        // Validation: At least 2 players
        if (playerCount < 2) {
            alert('You need at least 2 players to start a game!');
            return;
        }

        // Generate local game ID
        const localGameId = `local-${Date.now()}`;

        // Navigate to game page
        navigate(ROUTES.GAME(localGameId));
    };

    // Get active players
    const activePlayers = players.slice(0, playerCount);

    return (
        <div className="game-setup-page">
            <div className="setup-container">
                {/* Header */}
                <header className="setup-header">
                    <div className="header-content">
                        <h1 className="setup-title">Setup Game</h1>
                        <p className="setup-subtitle">
                            Configure players for <span className="mode-badge">{mode}</span> mode
                        </p>
                    </div>
                    <div className="match-type-badge">
                        Local Match 🏠
                    </div>
                </header>

                {/* Player List */}
                <div className="players-section">
                    <div className="section-header">
                        <h2 className="section-title">Players ({playerCount})</h2>
                        <p className="section-subtitle">Configure names, colors, and types</p>
                    </div>

                    <div className="players-list">
                        {activePlayers.map((player, idx) => (
                            <PlayerSetupCard
                                key={player.id}
                                index={idx}
                                player={player}
                                takenColors={takenColors}
                                onUpdate={(updates) => updatePlayer(idx, updates)}
                                onRemove={() => handleRemovePlayer(idx)}
                                canRemove={playerCount > 2}
                            />
                        ))}
                    </div>

                    {/* Add Player Button */}
                    {playerCount < 4 && (
                        <button
                            onClick={handleAddPlayer}
                            className="add-player-btn"
                            type="button"
                        >
                            <span className="add-icon">+</span>
                            Add Player
                        </button>
                    )}
                </div>

                {/* Footer Actions */}
                <footer className="setup-footer">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(ROUTES.GAME_MODES)}
                    >
                        ← Back
                    </Button>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={handleStartGame}
                        className="start-game-btn"
                    >
                        Start Game 🎲
                    </Button>
                </footer>
            </div>
        </div>
    );
};

export default GameSetupPage;
