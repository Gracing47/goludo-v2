/**
 * Landing Page
 * 
 * Simple Uniswap-style marketing page with:
 * - Hero section with CTA
 * - Live stats (games played, earnings, etc.)
 * 
 * "Launch App" navigates directly to the Ludo Lobby
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
        // Go directly to Ludo Lobby
        navigate(ROUTES.LUDO_LOBBY);
    };

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <div className="logo-badge">🎲</div>
                    <h1 className="hero-title">
                        <span className="gradient-text">GoLudo</span>
                    </h1>
                    <p className="hero-tagline">Play. Stake. Win.</p>
                    <p className="hero-subtitle">
                        The ultimate Web3 Ludo experience. Compete with friends,
                        stake crypto, and earn real rewards on Flare Network.
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

            {/* Footer */}
            <footer className="landing-footer">
                <p>© 2026 GoLudo. Built on Flare Network.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
