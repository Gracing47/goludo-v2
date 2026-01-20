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
import { motion } from 'framer-motion';
import { ROUTES } from '../config/routes';
import './LandingPage.css';

// SVG Icons for features
const ShieldIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const ZapIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

const TargetIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const RocketIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3" />
        <path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5" />
    </svg>
);

const GameIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="11" x2="10" y2="11" />
        <line x1="8" y1="9" x2="8" y2="13" />
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="17" cy="9" r="1" />
        <circle cx="15" cy="13" r="1" />
    </svg>
);

const CoinsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6" />
        <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
        <path d="M7 6h1v4" />
        <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
);

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
        icon: <ShieldIcon />,
        title: 'Secure Stakes',
        description: 'Smart contracts handle all bets. No custodial risks.',
        color: 'var(--pancake-cyan)'
    },
    {
        icon: <ZapIcon />,
        title: 'Instant Payouts',
        description: 'Win and withdraw instantly on Flare Network.',
        color: 'var(--accent-pink)'
    },
    {
        icon: <TargetIcon />,
        title: 'Fair Play',
        description: 'Verifiable randomness ensures every game is fair.',
        color: 'var(--pancake-yellow)'
    }
];

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const handleLaunchApp = () => {
        navigate(ROUTES.LUDO_LOBBY);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100
            }
        }
    };

    return (
        <div className="landing-page is-landing">
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
                <motion.div
                    className="hero-content"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    {/* Animated 3D Dice */}
                    <motion.div className="dice-container" variants={itemVariants}>
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
                    </motion.div>

                    {/* Title with Orbitron font */}
                    <motion.h1 className="hero-title" variants={itemVariants}>
                        <span className="gradient-text">GoLudo</span>
                    </motion.h1>

                    {/* Tagline with animation */}
                    <motion.p className="hero-tagline" variants={itemVariants}>
                        <span className="tag-word">Play.</span>
                        <span className="tag-word">Stake.</span>
                        <span className="tag-word">Win.</span>
                    </motion.p>

                    <motion.p className="hero-subtitle" variants={itemVariants}>
                        The ultimate Web3 Ludo experience on Flare Network.
                        <br />
                        Compete with friends, stake crypto, earn real rewards.
                    </motion.p>

                    {/* CTA Button */}
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <button className="btn-launch" onClick={handleLaunchApp}>
                            <span className="btn-icon"><RocketIcon /></span>
                            <span className="btn-text">Launch App</span>
                            <span className="btn-glow" />
                        </button>
                    </motion.div>

                    {/* Network Badge */}
                    <motion.div className="network-badge" variants={itemVariants}>
                        <span className="pulse-dot" />
                        <span>Live on Flare Network</span>
                    </motion.div>
                </motion.div>

                {/* Animated Background Orbs */}
                <div className="hero-bg">
                    <div className="bg-orb orb-1" />
                    <div className="bg-orb orb-2" />
                    <div className="bg-orb orb-3" />
                </div>
            </section>

            {/* Stats Section - Glassmorphic Cards */}
            <section className="stats-section">
                <motion.div
                    className="stats-grid"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={containerVariants}
                >
                    <motion.div className="stat-card" variants={itemVariants}>
                        <div className="stat-icon"><GameIcon /></div>
                        <span className="stat-value">{MOCK_STATS.gamesPlayed.toLocaleString()}</span>
                        <span className="stat-label">Games Played</span>
                    </motion.div>
                    <motion.div className="stat-card highlight" variants={itemVariants}>
                        <div className="stat-icon"><CoinsIcon /></div>
                        <span className="stat-value">{MOCK_STATS.totalEarned}</span>
                        <span className="stat-label">Total Earned</span>
                    </motion.div>
                    <motion.div className="stat-card" variants={itemVariants}>
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <span className="stat-value">{MOCK_STATS.activePlayers}</span>
                        <span className="stat-label">Active Now</span>
                    </motion.div>
                    <motion.div className="stat-card" variants={itemVariants}>
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <span className="stat-value">{MOCK_STATS.avgGameTime}</span>
                        <span className="stat-label">Avg. Game</span>
                    </motion.div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <motion.h2
                    className="section-title"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    Why GoLudo?
                </motion.h2>
                <div className="features-grid">
                    {FEATURES.map((feature, index) => (
                        <motion.div
                            key={index}
                            className="feature-card"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15 }}
                            whileHover={{ y: -10 }}
                        >
                            <div className="feature-icon" style={{ color: feature.color }}>
                                {feature.icon}
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </motion.div>
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
