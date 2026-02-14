/**
 * Lobby Store - Zustand State Management
 * 
 * Manages all lobby-related state including:
 * - Game mode selection
 * - Player configuration
 * - Web3 room browsing
 * - Waiting room state
 * 
 * Uses Zustand for performant, transient updates without
 * unnecessary re-renders.
 * 
 * @see https://github.com/pmndrs/zustand
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { LobbyState, Player, Room, GameType, GameModeId } from '@types/index';

/**
 * Initial player configuration
 */
const DEFAULT_PLAYERS: Player[] = [
    { id: 0, name: 'Player 1', color: 'red', type: 'human' },
    { id: 1, name: 'Player 2', color: 'green', type: 'human' },
    { id: 2, name: 'Player 3', color: 'yellow', type: 'ai' },
    { id: 3, name: 'Player 4', color: 'blue', type: 'ai' },
];

/**
 * Lobby Store
 * 
 * @example
 * ```tsx
 * function LobbyComponent() {
 *   const { gameMode, setGameMode } = useLobbyStore();
 *   
 *   return (
 *     <button onClick={() => setGameMode('ai')}>
 *       Play vs AI
 *     </button>
 *   );
 * }
 * ```
 */
export const useLobbyStore = create<LobbyState>()(
    devtools(
        (set) => ({
            // State
            step: 'menu',
            gameMode: null,
            gameModeVariant: 'classic',
            playerCount: 2,
            players: DEFAULT_PLAYERS,
            betAmount: '0.1',
            openRooms: [],
            waitingRoomId: null,
            selectedRoom: null,

            // Actions
            setStep: (step) => set({ step }, false, 'setStep'),

            setGameMode: (mode) => set({ gameMode: mode }, false, 'setGameMode'),

            setGameModeVariant: (variant) => set({ gameModeVariant: variant }, false, 'setGameModeVariant'),

            setPlayerCount: (count) => set({ playerCount: count }, false, 'setPlayerCount'),

            updatePlayer: (index, updates) => set((state) => {
                const newPlayers = [...state.players];
                newPlayers[index] = { ...newPlayers[index], ...updates };
                return { players: newPlayers };
            }, false, 'updatePlayer'),

            setBetAmount: (amount) => set({ betAmount: amount }, false, 'setBetAmount'),

            setOpenRooms: (rooms) => set({ openRooms: rooms }, false, 'setOpenRooms'),

            setWaitingRoomId: (id) => set({ waitingRoomId: id }, false, 'setWaitingRoomId'),

            setSelectedRoom: (room) => set({ selectedRoom: room }, false, 'setSelectedRoom'),

            reset: () => set({
                step: 'menu',
                gameMode: null,
                gameModeVariant: 'classic',
                playerCount: 2,
                players: DEFAULT_PLAYERS,
                betAmount: '0.1',
                openRooms: [],
                waitingRoomId: null,
                selectedRoom: null,
            }, false, 'reset'),
        }),
        {
            name: 'lobby-store',
            enabled: import.meta.env.DEV, // Only enable devtools in development
        }
    )
);

/**
 * Selectors for optimized component subscriptions
 * 
 * Use these to subscribe to specific parts of the store
 * to avoid unnecessary re-renders.
 * 
 * @example
 * ```tsx
 * function PlayerList() {
 *   // Only re-renders when players change
 *   const players = useLobbyStore(selectPlayers);
 *   return <div>{players.map(...)}</div>;
 * }
 * ```
 */
export const selectPlayers = (state: LobbyState) => state.players;
export const selectGameMode = (state: LobbyState) => state.gameMode;
export const selectStep = (state: LobbyState) => state.step;
export const selectOpenRooms = (state: LobbyState) => state.openRooms;
