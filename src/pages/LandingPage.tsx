/**
 * Landing Page
 * 
 * Premium Web3 Gaming Landing Page with:
 * - Hero section with animated dice
 * - Live stats in glassmorphic cards
 * - Feature highlights
 * - Particle background
 * 
 * Design System: Web3 Gaming (Orbitron + Exo 2)
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

// Feature cards data
const FEATURES = [
    {
        icon: '🔒',
        title: 'Secure Stakes',
        description: 'Smart contracts handle all bets. No custodial risks.'
    },
    {
        icon: '⚡',
        title: 'Instant Payouts',
        description: 'Win and withdraw instantly on Flare Network.'
    },
    {
        icon: '🎯',
        title: 'Fair Play',
        description: 'Verifiable randomness ensures every game is fair.'
    }
];

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const handleLaunchApp = () => {
        navigate(ROUTES.LUDO_LOBBY);
    };

    return (
        <div className="landing-page">
            {/* Animated Stars Background */}
            <div className="stars-bg">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="star"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 3}s`
                        }}
                    />
                ))}
            </div>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    {/* Animated 3D Dice */}
                    <div className="dice-container">
                        <div className="dice-3d">
                            <svg viewBox="0 0 100 100" className="dice-svg">
                                <defs>
                                    <linearGradient id="diceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="100%" stopColor="#e0e0e0" />
                                    </linearGradient>
                                    <filter id="diceShadow">
                                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
                                    </filter>
                                </defs>
                                <rect x="10" y="10" width="80" height="80" rx="12" fill="url(#diceGrad)" filter="url(#diceShadow)" />
                                {/* Dice dots */}
                                <circle cx="30" cy="30" r="8" fill="#1a1a2e" />
                                <circle cx="70" cy="30" r="8" fill="#1a1a2e" />
                                <circle cx="50" cy="50" r="8" fill="#ff007a" />
                                <circle cx="30" cy="70" r="8" fill="#1a1a2e" />
                                <circle cx="70" cy="70" r="8" fill="#1a1a2e" />
                            </svg>
                        </div>
                    </div>

                    {/* Title with Orbitron font */}
                    <h1 className="hero-title">
                        <span className="gradient-text">GoLudo</span>
                    </h1>

                    {/* Tagline with animation */}
                    <p className="hero-tagline">
                        <span className="tag-word">Play.</span>
                        <span className="tag-word">Stake.</span>
                        <span className="tag-word">Win.</span>
                    </p>

                    <p className="hero-subtitle">
                        The ultimate Web3 Ludo experience on Flare Network.
                        <br />
                        Compete with friends, stake crypto, earn real rewards.
                    </p>

                    {/* CTA Button */}
                    <button className="btn-launch" onClick={handleLaunchApp}>
                        <span className="btn-icon">🚀</span>
                        <span className="btn-text">Launch App</span>
                        <span className="btn-glow" />
                    </button>

                    {/* Network Badge */}
                    <div className="network-badge">
                        <span className="pulse-dot" />
                        <span>Live on Flare Network</span>
                    </div>
                </div>

                {/* Animated Background Orbs */}
                <div className="hero-bg">
                    <div className="bg-orb orb-1" />
                    <div className="bg-orb orb-2" />
                    <div className="bg-orb orb-3" />
                </div>
            </section>

            {/* Stats Section - Glassmorphic Cards */}
            <section className="stats-section">
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">🎮</div>
                        <span className="stat-value">{MOCK_STATS.gamesPlayed.toLocaleString()}</span>
                        <span className="stat-label">Games Played</span>
                    </div>
                    <div className="stat-card highlight">
                        <div className="stat-icon">💰</div>
                        <span className="stat-value">{MOCK_STATS.totalEarned}</span>
                        <span className="stat-label">Total Earned</span>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <span className="stat-value">{MOCK_STATS.activePlayers}</span>
                        <span className="stat-label">Active Now</span>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⏱️</div>
                        <span className="stat-value">{MOCK_STATS.avgGameTime}</span>
                        <span className="stat-label">Avg. Game</span>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <h2 className="section-title">Why GoLudo?</h2>
                <div className="features-grid">
                    {FEATURES.map((feature, index) => (
                        <div key={index} className="feature-card">
                            <div className="feature-icon">{feature.icon}</div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <p>© 2026 GoLudo. Built with ❤️ on Flare Network.</p>
                    <div className="footer-links">
                        <a href="#" className="footer-link">Docs</a>
                        <a href="#" className="footer-link">Twitter</a>
                        <a href="#" className="footer-link">Discord</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
