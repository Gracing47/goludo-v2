/**
 * Landing Page — IRIS Bold Edition
 *
 * IRIS "Deep Space Neon" design language:
 * - Asymmetric hero: display text offset left, dice cluster anchored top-right
 * - Scroll-triggered staggered reveals (IntersectionObserver) on stats + features
 * - Parallax depth on background orbs via CSS custom property
 * - Spring-physics motion via framer-motion + CSS --ease-spring
 * - Premium tactile CTA (shimmer sweep + bloom)
 * - Full IRIS token consumption — zero purple
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { ROUTES } from '../config/routes';
import { formatStake } from '../config/currency';
import './LandingPage.css';

// ─── SVG Icons ───────────────────────────────────────────────────────────────

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

// ─── Static Data ─────────────────────────────────────────────────────────────

const MOCK_STATS = {
    gamesPlayed: 12847,
    totalEarned: formatStake('245.8'),
    activePlayers: 342,
    avgGameTime: '8 min',
};

const FEATURES = [
    {
        icon: <ShieldIcon />,
        title: 'Secure Stakes',
        description: 'Smart contracts handle all bets. No custodial risks, no middlemen.',
        accent: 'cyan',
    },
    {
        icon: <ZapIcon />,
        title: 'Instant Payouts',
        description: 'Win and withdraw instantly on Flare Network. Gas-optimised.',
        accent: 'pink',
    },
    {
        icon: <TargetIcon />,
        title: 'Fair Play',
        description: 'Verifiable on-chain randomness ensures every roll is provably fair.',
        accent: 'gold',
    },
];

// ─── Spring variants (Framer) ─────────────────────────────────────────────────

const heroTextVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: (delay: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 120,
            damping: 14,
            delay,
        },
    }),
};

const diceVariants: Variants = {
    hidden: { opacity: 0, scale: 0.7, rotate: -15 },
    visible: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: {
            type: 'spring',
            stiffness: 80,
            damping: 12,
            delay: 0.1,
        },
    },
};

// ─── Component ───────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const heroRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<HTMLElement>(null);
    const featuresRef = useRef<HTMLElement>(null);

    const handleLaunchApp = () => {
        navigate(ROUTES.LUDO_LOBBY);
    };

    // Parallax: drive --hero-scroll CSS custom property on the hero background
    useEffect(() => {
        const hero = heroRef.current;
        if (!hero) return;

        const onScroll = () => {
            const scrollY = window.scrollY;
            hero.style.setProperty('--hero-scroll', `${scrollY}px`);
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Scroll-triggered reveals for stats and features sections
    useEffect(() => {
        const targets = [
            ...(statsRef.current?.querySelectorAll<HTMLElement>('.reveal-up') ?? []),
            ...(featuresRef.current?.querySelectorAll<HTMLElement>('.reveal-up') ?? []),
        ];

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        targets.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <div className="landing-page is-landing">

            {/* ── Fixed Deep-Space Background ── */}
            <div className="stars-bg" aria-hidden="true">
                {[...Array(60)].map((_, i) => (
                    <div
                        key={i}
                        className="star"
                        style={{
                            left: `${(i * 1.618034 * 37) % 100}%`,
                            top:  `${(i * 1.618034 * 61) % 100}%`,
                            animationDelay: `${(i * 0.17) % 4}s`,
                            animationDuration: `${2.5 + (i * 0.11) % 2.5}s`,
                        }}
                    />
                ))}
            </div>

            {/* Scanline grid overlay — depth cue */}
            <div className="cosmos-grid" aria-hidden="true" />

            {/* ── Hero ── */}
            <section className="hero" ref={heroRef}>

                {/* Parallax orbs (driven by --hero-scroll) */}
                <div className="hero-bg" aria-hidden="true">
                    <div className="bg-orb orb-1" />
                    <div className="bg-orb orb-2" />
                    <div className="bg-orb orb-3" />
                    <div className="bg-orb orb-4" />
                </div>

                {/* Decorative over-sized dice — anchored top-right, breaks the grid */}
                <motion.div
                    className="hero-dice-cluster"
                    variants={diceVariants}
                    initial="hidden"
                    animate="visible"
                    aria-hidden="true"
                >
                    {/* Primary large die */}
                    <div className="dice-3d dice-primary">
                        <svg viewBox="0 0 120 120" className="dice-svg" role="img" aria-label="Decorative dice">
                            <defs>
                                <linearGradient id="diceGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="rgba(0,243,255,0.18)" />
                                    <stop offset="100%" stopColor="rgba(58,134,255,0.12)" />
                                </linearGradient>
                                <filter id="diceShadowPrimary">
                                    <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#00f3ff" floodOpacity="0.35" />
                                    <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.6" />
                                </filter>
                            </defs>
                            <rect x="8" y="8" width="104" height="104" rx="18"
                                fill="url(#diceGradPrimary)"
                                stroke="rgba(0,243,255,0.30)"
                                strokeWidth="1.5"
                                filter="url(#diceShadowPrimary)" />
                            {/* top-edge highlight */}
                            <rect x="8" y="8" width="104" height="2" rx="2" fill="rgba(255,255,255,0.12)" />
                            {/* Dots — 5 face */}
                            <circle cx="36" cy="36" r="9" fill="var(--neon-cyan)" opacity="0.9">
                                <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="84" cy="36" r="9" fill="var(--neon-cyan)" opacity="0.9" />
                            <circle cx="60" cy="60" r="9" fill="var(--neon-pink)">
                                <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="36" cy="84" r="9" fill="var(--neon-cyan)" opacity="0.9" />
                            <circle cx="84" cy="84" r="9" fill="var(--neon-cyan)" opacity="0.9" />
                        </svg>
                    </div>
                    {/* Secondary smaller die — offset */}
                    <div className="dice-3d dice-secondary">
                        <svg viewBox="0 0 100 100" className="dice-svg" role="img" aria-label="">
                            <defs>
                                <linearGradient id="diceGradSecondary" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="rgba(255,0,122,0.16)" />
                                    <stop offset="100%" stopColor="rgba(58,134,255,0.10)" />
                                </linearGradient>
                                <filter id="diceShadowSecondary">
                                    <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#ff007a" floodOpacity="0.30" />
                                </filter>
                            </defs>
                            <rect x="6" y="6" width="88" height="88" rx="14"
                                fill="url(#diceGradSecondary)"
                                stroke="rgba(255,0,122,0.25)"
                                strokeWidth="1"
                                filter="url(#diceShadowSecondary)" />
                            <rect x="6" y="6" width="88" height="2" rx="2" fill="rgba(255,255,255,0.10)" />
                            {/* Dots — 3 face */}
                            <circle cx="30" cy="30" r="7" fill="var(--neon-pink)" opacity="0.85" />
                            <circle cx="50" cy="50" r="7" fill="var(--neon-gold)" opacity="0.9" />
                            <circle cx="70" cy="70" r="7" fill="var(--neon-pink)" opacity="0.85" />
                        </svg>
                    </div>
                    {/* Tertiary tiny accent die */}
                    <div className="dice-3d dice-tertiary">
                        <svg viewBox="0 0 80 80" className="dice-svg" role="img" aria-label="">
                            <defs>
                                <linearGradient id="diceGradTertiary" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="rgba(255,215,0,0.14)" />
                                    <stop offset="100%" stopColor="rgba(0,243,255,0.08)" />
                                </linearGradient>
                                <filter id="diceShadowTertiary">
                                    <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#ffd700" floodOpacity="0.28" />
                                </filter>
                            </defs>
                            <rect x="5" y="5" width="70" height="70" rx="12"
                                fill="url(#diceGradTertiary)"
                                stroke="rgba(255,215,0,0.22)"
                                strokeWidth="1"
                                filter="url(#diceShadowTertiary)" />
                            {/* Single center dot — 1 face */}
                            <circle cx="40" cy="40" r="8" fill="var(--neon-gold)" opacity="0.9">
                                <animate attributeName="opacity" values="0.9;1;0.9" dur="4s" repeatCount="indefinite" />
                            </circle>
                        </svg>
                    </div>
                </motion.div>

                {/* Hero text — offset left */}
                <div className="hero-text-block">

                    {/* Eyebrow chip */}
                    <motion.div
                        className="hero-eyebrow"
                        variants={heroTextVariants}
                        custom={0}
                        initial="hidden"
                        animate="visible"
                    >
                        <span className="hud-chip">
                            <span className="pulse-dot" />
                            Live on Flare Network
                        </span>
                    </motion.div>

                    {/* Main title */}
                    <motion.h1
                        className="hero-title"
                        variants={heroTextVariants}
                        custom={0.08}
                        initial="hidden"
                        animate="visible"
                    >
                        <span className="hero-title-line hero-title-go">Go</span>
                        <span className="hero-title-line gradient-text-hero">Ludo</span>
                    </motion.h1>

                    {/* Tagline words — staggered */}
                    <motion.div
                        className="hero-tagline"
                        variants={heroTextVariants}
                        custom={0.18}
                        initial="hidden"
                        animate="visible"
                    >
                        <span className="tag-word tag-play">Play.</span>
                        <span className="tag-separator" aria-hidden="true" />
                        <span className="tag-word tag-stake">Stake.</span>
                        <span className="tag-separator" aria-hidden="true" />
                        <span className="tag-word tag-win">Win.</span>
                    </motion.div>

                    {/* Description */}
                    <motion.p
                        className="hero-description"
                        variants={heroTextVariants}
                        custom={0.26}
                        initial="hidden"
                        animate="visible"
                    >
                        The classic board game, reimagined on-chain. Stake real assets, roll verifiable dice, and claim your winnings instantly — no house, no middlemen.
                    </motion.p>

                    {/* CTA group */}
                    <motion.div
                        className="hero-cta-group"
                        variants={heroTextVariants}
                        custom={0.34}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.button
                            className="btn-launch shimmer"
                            onClick={handleLaunchApp}
                            whileHover={{
                                y: -4,
                                scale: 1.03,
                                transition: { type: 'spring', stiffness: 400, damping: 18 },
                            }}
                            whileTap={{
                                scale: 0.97,
                                transition: { duration: 0.08, ease: [0.25, 1.4, 0.5, 1] },
                            }}
                        >
                            <span className="btn-icon" aria-hidden="true"><RocketIcon /></span>
                            <span className="btn-text">Launch App</span>
                            <span className="btn-glow" aria-hidden="true" />
                        </motion.button>

                        <a href="#features" className="btn-ghost">
                            Explore Features
                        </a>
                    </motion.div>

                </div>
            </section>

            {/* ── Stats ── */}
            <section className="stats-section" ref={statsRef}>
                <div className="stats-section-inner">
                    <div className="stats-grid reveal-stagger">
                        <div className="stat-card reveal-up">
                            <div className="stat-icon" aria-hidden="true"><GameIcon /></div>
                            <span className="stat-value">{MOCK_STATS.gamesPlayed.toLocaleString()}</span>
                            <span className="stat-label">Games Played</span>
                        </div>
                        <div className="stat-card stat-card--highlight reveal-up">
                            <div className="stat-icon" aria-hidden="true"><CoinsIcon /></div>
                            <span className="stat-value stat-value--gold">{MOCK_STATS.totalEarned}</span>
                            <span className="stat-label">Total Earned</span>
                        </div>
                        <div className="stat-card reveal-up">
                            <div className="stat-icon" aria-hidden="true">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <span className="stat-value">{MOCK_STATS.activePlayers}</span>
                            <span className="stat-label">Active Now</span>
                        </div>
                        <div className="stat-card reveal-up">
                            <div className="stat-icon" aria-hidden="true">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                            <span className="stat-value">{MOCK_STATS.avgGameTime}</span>
                            <span className="stat-label">Avg. Game</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="features-section" id="features" ref={featuresRef}>
                <div className="features-section-inner">

                    <div className="section-header reveal-up">
                        <span className="hud-chip pink section-chip">Why GoLudo?</span>
                        <h2 className="section-title">Built different.</h2>
                        <p className="section-subtitle">Three pillars that separate GoLudo from every other Web3 game.</p>
                    </div>

                    <div className="features-grid reveal-stagger">
                        {FEATURES.map((feature, index) => (
                            <motion.div
                                key={index}
                                className={`feature-card feature-card--${feature.accent} glass-card reveal-up`}
                                whileHover={{
                                    y: -8,
                                    scale: 1.015,
                                    transition: { type: 'spring', stiffness: 300, damping: 20 },
                                }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className={`feature-icon feature-icon--${feature.accent}`} aria-hidden="true">
                                    {feature.icon}
                                </div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-desc">{feature.description}</p>
                                {/* Accent edge bar */}
                                <div className="feature-accent-bar" aria-hidden="true" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <p className="footer-copy">© 2026 $GOLudo — Built on Flare Network.</p>
                    <nav className="footer-links" aria-label="Footer links">
                        <a href="#" className="footer-link">Docs</a>
                        <a href="#" className="footer-link">Twitter</a>
                        <a href="#" className="footer-link">Discord</a>
                    </nav>
                </div>
            </footer>

        </div>
    );
};

export default LandingPage;
