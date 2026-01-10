/**
 * Home Page - Main Menu
 * 
 * Landing page with game mode selection.
 * Entry point for all game flows.
 * 
 * Features:
 * - Game mode buttons (Local, AI, Web3)
 * - Navigation to game modes page
 * - Wallet connection status
 */

import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import './HomePage.css';

export const HomePage = () => {
    const navigate = useNavigate();

    return (
        <div className="home-page">
            <div className="home-container">
                {/* Header */}
                <header className="home-header">
                    <h1 className="home-title">GoLudo</h1>
                    <p className="home-subtitle">AAA Quality • Mobile First • Web3 Ready</p>
                </header>

                {/* Main Menu */}
                <div className="home-menu">
                    <button
                        className="menu-btn primary"
                        onClick={() => navigate(ROUTES.SETUP('local'))}
                    >
                        <span className="menu-icon">👥</span>
                        <div className="menu-text">
                            <strong>Local Game</strong>
                            <small>Play with friends offline</small>
                        </div>
                    </button>

                    <button
                        className="menu-btn secondary"
                        onClick={() => navigate(ROUTES.SETUP('ai'))}
                    >
                        <span className="menu-icon">🤖</span>
                        <div className="menu-text">
                            <strong>vs Computer</strong>
                            <small>Challenge the AI</small>
                        </div>
                    </button>

                    <button
                        className="menu-btn web3"
                        onClick={() => navigate(ROUTES.WEB3_LOBBY)}
                    >
                        <span className="menu-icon">🔗</span>
                        <div className="menu-text">
                            <strong>Web3 Match</strong>
                            <small>Play on Flare Network</small>
                        </div>
                    </button>

                    <button
                        className="menu-btn modes"
                        onClick={() => navigate(ROUTES.GAME_MODES)}
                    >
                        <span className="menu-icon">🎮</span>
                        <div className="menu-text">
                            <strong>Game Modes</strong>
                            <small>Classic, Fast, Team Play</small>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <footer className="home-footer">
                    <p>USA Standard Rules • Safe Zones • Blockades</p>
                </footer>
            </div>
        </div>
    );
};

export default HomePage;
