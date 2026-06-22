import type { ComponentType } from 'react';
import type { GameConfig } from '../types';

/**
 * Type shim for the legacy Lobby.jsx component.
 * Lobby.jsx is the matchmaking/lobby UI pending migration to TypeScript
 * (see docs/_internal/INSIDE-TICKET-AAA-SCALE-ECONOMY.md, P1 Foundation).
 */
export interface LobbyProps {
    onStartGame: (config: GameConfig) => void;
}

declare const Lobby: ComponentType<LobbyProps>;
export default Lobby;
