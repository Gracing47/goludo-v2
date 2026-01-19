/**
 * Landing Page
 * 
 * Premium marketing page with:
 * - Hero section with CTA
 * - Live stats (games played, earnings, etc.)
 * - Game showcase
 * 
 * This is the entry point when users visit goludo.app
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import './LandingPage.css';

// Mock stats - will be replaced with API call
const MOCK_STATS = {
    gamesPlayed: 12847,
    totalEarned: '245.8 ETH',
    activePlayers: 342,
    avgGameTime: '8 min',
};

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const handleLaunchApp = () => {
        navigate(ROUTES.APP);
    };

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        <span className="gradient-text">Play.</span>
                        <span className="gradient-text">Stake.</span>
                        <span className="gradient-text">Win.</span>
                    </h1>
                    <p className="hero-subtitle">
                        The ultimate Web3 gaming platform. Compete in classic board games,
                        stake crypto, and earn real rewards.
                    </p>
                    <button className="btn-launch" onClick={handleLaunchApp}>
                        🚀 Launch App
                    </button>
                </div>

                {/* Animated Background */}
                <div className="hero-bg">
                    <div className="bg-orb orb-1" />
                    <div className="bg-orb orb-2" />
                    <div className="bg-orb orb-3" />
                </div>
            </section>

            {/* Stats Bar */}
            <section className="stats-bar">
                <div className="stat-item">
                    <span className="stat-value">{MOCK_STATS.gamesPlayed.toLocaleString()}</span>
                    <span className="stat-label">Games Played</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                    <span className="stat-value">{MOCK_STATS.totalEarned}</span>
                    <span className="stat-label">Total Earned</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                    <span className="stat-value">{MOCK_STATS.activePlayers}</span>
                    <span className="stat-label">Active Now</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                    <span className="stat-value">{MOCK_STATS.avgGameTime}</span>
                    <span className="stat-label">Avg. Game</span>
                </div>
            </section>

            {/* Game Showcase */}
            <section className="game-showcase">
                <h2 className="section-title">Featured Games</h2>
                <div className="game-cards">
                    <div className="game-card featured" onClick={handleLaunchApp}>
                        <div className="card-badge">🔥 Most Popular</div>
                        <div className="card-icon">🎲</div>
                        <h3>Ludo</h3>
                        <p>Classic board game with Web3 stakes</p>
                        <div className="card-stats">
                            <span>2-4 Players</span>
                            <span>0.01 - 1 ETH</span>
                        </div>
                    </div>

                    <div className="game-card coming-soon">
                        <div className="card-badge">Coming Soon</div>
                        <div className="card-icon">♟️</div>
                        <h3>Chess</h3>
                        <p>Stake and checkmate</p>
                    </div>

                    <div className="game-card coming-soon">
                        <div className="card-badge">Coming Soon</div>
                        <div className="card-icon">🃏</div>
                        <h3>Cards</h3>
                        <p>Classic card games</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>© 2026 GoLudo. Built on Celo.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
