/**
 * Ludo Lobby Page
 * 
 * This page wraps the existing Lobby component and handles navigation.
 * It serves as the bridge between the new routing system and the existing lobby logic.
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Lobby from '../components/Lobby';
import { gameRoute, ROUTES } from '../config/routes';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';

const LudoLobby: React.FC = () => {
    const navigate = useNavigate();

    const { setConfig, setAppState, setState } = useGameStore(useShallow((s) => ({
        setConfig: s.setConfig,
        setAppState: s.setAppState,
        setState: s.setState,
    })));

    /**
     * Handle game start from Lobby component
     * Sets up game state BEFORE navigation to ensure GameRoom has data
     */
    const handleStartGame = useCallback((config: any) => {
        // Set config and state FIRST, THEN navigate
        setConfig(config);
        setAppState('game');

        // Navigate to game room
        if (config.mode === 'web3' && config.roomId) {
            // Web3: Use existing room ID from blockchain
            navigate(gameRoute(config.roomId));
        } else {
            // Local/AI: Generate a new room ID
            const newGameId = Math.random().toString(36).substring(2, 11);
            navigate(gameRoute(newGameId));
        }
    }, [navigate, setConfig, setAppState]);

    const handleBack = useCallback(() => {
        navigate(ROUTES.LANDING);
    }, [navigate]);

    return (
        <div className="ludo-lobby-page">
            {/* Back Button Header */}
            <header className="lobby-header">
                <button className="btn-back-lobby" onClick={handleBack}>
                    ← Home
                </button>
            </header>

            {/* Existing Lobby Component */}
            <Lobby onStartGame={handleStartGame} />
        </div>
    );
};

export default LudoLobby;
