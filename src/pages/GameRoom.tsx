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

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import App from '../App';
import { ROUTES } from '../config/routes';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';

const GameRoom: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();

    const { appState, config, setAppState } = useGameStore(useShallow((s) => ({
        appState: s.appState,
        config: s.config,
        setAppState: s.setAppState,
    })));

    /**
     * Ensure we're in game state when accessing this route
     * If no config exists, try to resume from localStorage or redirect
     */
    useEffect(() => {
        if (!roomId) {
            // No room ID in URL, redirect to lobby
            navigate(ROUTES.LUDO_LOBBY);
            return;
        }

        // If we're coming directly to this URL (refresh or direct link)
        if (appState === 'lobby' && !config) {
            // Try to resume from localStorage
            const savedData = localStorage.getItem(`ludo_game_${roomId}`);

            if (savedData) {
                // Game exists in localStorage, App component will handle resumption
                setAppState('game');
            } else if (roomId.length > 20) {
                // Looks like a Web3 room ID (bytes32 hash), App will connect
                setAppState('game');
            } else {
                // Unknown room, redirect to lobby
                navigate(ROUTES.LUDO_LOBBY);
            }
        }
    }, [roomId, appState, config, navigate, setAppState]);

    // The App component handles all game logic
    // We just render it here in the game route context
    return <App />;
};

export default GameRoom;
