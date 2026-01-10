/**
 * Game Modes Page
 * 
 * Displays all available game modes and allows selection.
 * Integrates with Zustand store and navigates to setup page.
 * 
 * Features:
 * - Grid layout of game mode cards
 * - Store integration for mode selection
 * - Type-safe navigation
 * - Back button to home
 */

import { useNavigate } from 'react-router-dom';
import { GAME_MODES } from '../config/gameModes';
import { ROUTES } from '../config/routes';
import { useLobbyStore } from '../store/useLobbyStore';
import { GameModeCard } from '../components/lobby/GameModeCard';
import { Button } from '../components/common/Button';
import './GameModesPage.css';

export const GameModesPage = () => {
    const navigate = useNavigate();
    const setGameModeVariant = useLobbyStore((state) => state.setGameModeVariant);

    /**
     * Handle game mode selection
     * Updates store and navigates to setup page
     */
    const handleModeSelect = (modeId: string) => {
        // Update global store with selected mode variant
        setGameModeVariant(modeId as any);

        // Navigate to setup page with mode in URL
        navigate(ROUTES.SETUP('local') + `?mode=${modeId}`);
    };

    return (
        <div className="game-modes-page">
            <div className="modes-container">
                {/* Header Section */}
                <header className="modes-header">
                    <h1 className="modes-title">Select Game Mode</h1>
                    <p className="modes-subtitle">
                        Choose your preferred way to play Ludo
                    </p>
                </header>

                {/* Grid Section */}
                <div className="modes-grid">
                    {GAME_MODES.map((mode) => (
                        <GameModeCard
                            key={mode.id}
                            mode={mode}
                            onClick={handleModeSelect}
                        />
                    ))}
                </div>

                {/* Footer Navigation */}
                <footer className="modes-footer">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(ROUTES.HOME)}
                    >
                        ← Back to Menu
                    </Button>
                </footer>
            </div>
        </div>
    );
};

export default GameModesPage;
