/**
 * Game Browser
 *
 * Dashboard showing available games to play.
 * Users can browse games, see stats, and navigate to lobbies.
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import { NATIVE_CURRENCY_SYMBOL } from '../config/currency';
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
        stakeRange: `0.01 – 1 ${NATIVE_CURRENCY_SYMBOL}`,
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

/** Stagger float animation delay per tile so they drift out of phase */
const FLOAT_DELAYS = ['0ms', '700ms', '1400ms', '350ms', '1050ms', '1750ms'];

const GameBrowser: React.FC = () => {
    const navigate = useNavigate();
    const gridRef = useRef<HTMLDivElement>(null);

    // IntersectionObserver-driven stagger reveal
    useEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting) {
                    grid.classList.add('is-visible');
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(grid);
        return () => observer.disconnect();
    }, []);

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
                <div className="browser-section-label">
                    <h2>Select Arena</h2>
                </div>

                <div
                    className="games-grid reveal-up reveal-stagger"
                    ref={gridRef}
                >
                    {GAMES.map((game, i) => (
                        <div
                            key={game.id}
                            className={`game-tile ${game.available ? 'available' : 'locked'}`}
                            style={{ '--tile-float-delay': FLOAT_DELAYS[i % FLOAT_DELAYS.length] } as React.CSSProperties}
                            onClick={() => handleGameClick(game)}
                        >
                            {/* Grain texture layer */}
                            <div className="tile-grain" aria-hidden="true" />

                            {!game.available && (
                                <div className="tile-lock" aria-label="Coming soon">🔒</div>
                            )}

                            <div className="tile-icon" aria-hidden="true">
                                {game.icon}
                            </div>

                            <h3>{game.name}</h3>
                            <p>{game.description}</p>

                            <div className="tile-meta">
                                <span className="tile-meta-badge players">
                                    {game.players}
                                </span>
                                <span className={`tile-meta-badge ${game.available ? 'stake' : 'coming-soon'}`}>
                                    {game.stakeRange}
                                </span>
                            </div>

                            {game.available && (
                                <button className="btn-play" onClick={(e) => { e.stopPropagation(); handleGameClick(game); }}>
                                    Play Now
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default GameBrowser;
