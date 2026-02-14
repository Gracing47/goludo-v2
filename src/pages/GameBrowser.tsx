/**
 * Game Browser
 * 
 * Dashboard showing available games to play.
 * Users can browse games, see stats, and navigate to lobbies.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import './GameBrowser.css';

interface GameInfo {
    id: string;
    name: string;
    icon: string;
    description: string;
    players: string;
    stakeRange: string;
    route: string;
    available: boolean;
}

const GAMES: GameInfo[] = [
    {
        id: 'ludo',
        name: 'Ludo',
        icon: '🎲',
        description: 'Classic board game. Race your tokens home!',
        players: '2-4 Players',
        stakeRange: '0.01 - 1 ETH',
        route: ROUTES.LUDO_LOBBY,
        available: true,
    },
    {
        id: 'chess',
        name: 'Chess',
        icon: '♟️',
        description: 'The ultimate strategy game.',
        players: '2 Players',
        stakeRange: 'Coming Soon',
        route: '',
        available: false,
    },
    {
        id: 'checkers',
        name: 'Checkers',
        icon: '⚫',
        description: 'Jump and capture your way to victory.',
        players: '2 Players',
        stakeRange: 'Coming Soon',
        route: '',
        available: false,
    },
];

const GameBrowser: React.FC = () => {
    const navigate = useNavigate();

    const handleGameClick = (game: GameInfo) => {
        if (game.available && game.route) {
            navigate(game.route);
        }
    };

    const handleBack = () => {
        navigate(ROUTES.LANDING);
    };

    return (
        <div className="game-browser">
            {/* Header */}
            <header className="browser-header">
                <button className="btn-back" onClick={handleBack}>
                    ← Back
                </button>
                <h1>Games</h1>
                <div className="header-spacer" />
            </header>

            {/* Game Grid */}
            <main className="browser-content">
                <div className="games-grid">
                    {GAMES.map((game) => (
                        <div
                            key={game.id}
                            className={`game-tile ${game.available ? 'available' : 'locked'}`}
                            onClick={() => handleGameClick(game)}
                        >
                            {!game.available && <div className="tile-lock">🔒</div>}
                            <div className="tile-icon">{game.icon}</div>
                            <h3>{game.name}</h3>
                            <p>{game.description}</p>
                            <div className="tile-meta">
                                <span>{game.players}</span>
                                <span>{game.stakeRange}</span>
                            </div>
                            {game.available && (
                                <button className="btn-play">Play Now</button>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default GameBrowser;
