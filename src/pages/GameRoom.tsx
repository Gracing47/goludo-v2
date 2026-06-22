/**
 * Game Room Page
 *
 * This page wraps the main App component (game logic) and handles:
 * - Loading game state from URL params
 * - Resuming games from localStorage
 * - Initializing socket connections for Web3 matches
 *
 * It acts as the boundary between the routing layer and the game engine.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import App from '../App';
import { ROUTES } from '../config/routes';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';

/* ============================================
   INLINE STYLES — scoped to loading state only,
   so we don't need a new CSS file import.
   All values consume design-system tokens via
   CSS custom properties already on :root.
   ============================================ */

const styles = {
    shell: {
        position: 'fixed' as const,
        inset: 0,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(0,243,255,0.07) 0%, transparent 60%), linear-gradient(160deg, #06060f 0%, #0b0b1e 100%)',
        backgroundAttachment: 'fixed',
        color: '#fff',
        gap: '0',
        overflow: 'hidden',
    },
    card: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '28px',
        padding: '48px 40px',
        background: 'rgba(10,10,25,0.72)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        border: '1.5px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.65), 0 24px 56px rgba(0,0,0,0.55), 0 48px 96px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.09)',
        position: 'relative' as const,
        overflow: 'hidden' as const,
        isolation: 'isolate' as const,
        maxWidth: '400px',
        width: '88vw',
        animation: 'slideUp 360ms cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
    },
    topEdge: {
        position: 'absolute' as const,
        top: 0,
        left: '8%',
        right: '8%',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), rgba(0,243,255,0.06), rgba(255,255,255,0.10), transparent)',
        pointerEvents: 'none' as const,
    },
    leftAccent: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '4px',
        height: '100%',
        background: 'linear-gradient(180deg, #00f3ff 0%, #ff007a 100%)',
        borderRadius: '24px 0 0 24px',
        opacity: 0.8,
    },
    spinnerWrap: {
        position: 'relative' as const,
        width: '64px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    spinnerRing: {
        position: 'absolute' as const,
        inset: 0,
        borderRadius: '50%',
        border: '2px solid rgba(0,243,255,0.12)',
        borderTopColor: '#00f3ff',
        animation: 'spin 1.1s linear infinite',
        boxShadow: '0 0 16px rgba(0,243,255,0.25), 0 0 48px rgba(0,243,255,0.12)',
    },
    spinnerRingOuter: {
        position: 'absolute' as const,
        inset: '-8px',
        borderRadius: '50%',
        border: '1.5px solid rgba(255,0,122,0.10)',
        borderTopColor: 'rgba(255,0,122,0.35)',
        animation: 'spin 2.0s linear infinite reverse',
    },
    spinnerDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#00f3ff',
        boxShadow: '0 0 16px rgba(0,243,255,0.8)',
    },
    textBlock: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '8px',
        textAlign: 'center' as const,
    },
    headline: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '1rem',
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase' as const,
        color: '#fff',
        margin: 0,
    },
    sub: {
        fontFamily: "'Outfit', sans-serif",
        fontSize: '0.875rem',
        color: 'rgba(148,163,184,1)',
        margin: 0,
        letterSpacing: '0.01em',
    },
    roomChip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        background: 'rgba(0,243,255,0.08)',
        border: '1px solid rgba(0,243,255,0.25)',
        borderRadius: '9999px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        color: '#00f3ff',
        boxShadow: '0 0 16px rgba(0,243,255,0.25), 0 0 48px rgba(0,243,255,0.12)',
        maxWidth: '260px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    roomChipDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: '#00f3ff',
        boxShadow: '0 0 8px rgba(0,243,255,0.9)',
        flexShrink: 0,
        animation: 'glow-pulse-anim 2s ease-in-out infinite',
    },
};

const GameRoom: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [isValidRoom, setIsValidRoom] = useState<boolean | null>(null);

    const { config, state, setAppState, setConfig, setGameState } = useGameStore(useShallow((s) => ({
        config: s.config,
        state: s.state,
        setAppState: s.setAppState,
        setConfig: s.setConfig,
        setGameState: s.setGameState,
    })));

    /**
     * Validate room and initialize game state
     */
    useEffect(() => {
        if (!roomId) {
            // No room ID in URL, redirect to lobby
            navigate(ROUTES.LUDO_LOBBY, { replace: true });
            return;
        }

        // If we already have valid game state, we're good
        if (state && config) {
            setIsValidRoom(true);
            return;
        }

        // Try to resume from localStorage
        const savedData = localStorage.getItem(`ludo_game_${roomId}`);

        if (savedData) {
            try {
                const { config: savedConfig, state: savedState } = JSON.parse(savedData);
                setConfig(savedConfig);
                setGameState(savedState);
                setAppState('game');
                setIsValidRoom(true);
                return;
            } catch (e) {
                console.warn("Failed to resume game from localStorage", e);
            }
        }

        // Check if it's a Web3 room ID (bytes32 hash = 66 chars with 0x prefix or 64 without)
        if (roomId.length > 20) {
            // Looks like a Web3 room, let App.jsx handle socket connection
            setAppState('game');
            setIsValidRoom(true);
            return;
        }

        // Unknown/invalid room - redirect to lobby
        console.warn(`Room ${roomId} not found, redirecting to lobby`);
        navigate(ROUTES.LUDO_LOBBY, { replace: true });
    }, [roomId, state, config, navigate, setAppState, setConfig, setGameState]);

    // Show branded loading state while validating (will redirect if invalid)
    if (isValidRoom === null) {
        const shortId = roomId
            ? roomId.length > 14
                ? `${roomId.slice(0, 6)}…${roomId.slice(-4)}`
                : roomId
            : '—';

        return (
            <div style={styles.shell} aria-label="Loading game room">
                <div style={styles.card}>
                    {/* Decorative edges */}
                    <div style={styles.topEdge} aria-hidden="true" />
                    <div style={styles.leftAccent} aria-hidden="true" />

                    {/* Dual-ring spinner */}
                    <div style={styles.spinnerWrap} aria-hidden="true">
                        <div style={styles.spinnerRingOuter} />
                        <div style={styles.spinnerRing} />
                        <div style={styles.spinnerDot} />
                    </div>

                    {/* Text */}
                    <div style={styles.textBlock}>
                        <p style={styles.headline}>Entering Room</p>
                        <p style={styles.sub}>Syncing on-chain state…</p>
                    </div>

                    {/* Room ID chip */}
                    {roomId && (
                        <div style={styles.roomChip} title={roomId}>
                            <span style={styles.roomChipDot} aria-hidden="true" />
                            {shortId}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // If invalid, we're redirecting - show nothing
    if (!isValidRoom) {
        return null;
    }

    // Valid room - render the game
    return <App />;
};

export default GameRoom;
