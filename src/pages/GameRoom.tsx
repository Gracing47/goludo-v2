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
import { createInitialState } from '../engine/gameLogic';

const GameRoom: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [isValidRoom, setIsValidRoom] = useState<boolean | null>(null);

    const { appState, config, state, setAppState, setConfig, setGameState } = useGameStore(useShallow((s) => ({
        appState: s.appState,
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

    // Show nothing while validating (will redirect if invalid)
    if (isValidRoom === null) {
        return null;
    }

    // If invalid, we're redirecting - show nothing
    if (!isValidRoom) {
        return null;
    }

    // Valid room - render the game
    return <App />;
};

export default GameRoom;
