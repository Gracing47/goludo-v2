/**
 * Socket Manager Hook
 * 
 * Dedicated hook for managing Socket.io connections and events.
 * Follows 2025 best practices:
 * - Socket events update Zustand store directly
 * - Cleanup on disconnect
 * - Reconnection handling
 * 
 * @example
 * ```tsx
 * function GameController() {
 *   const socketRef = useSocketManager();
 *   
 *   const handleRoll = () => {
 *     socketRef.current?.emit('roll_dice', { roomId, playerAddress });
 *   };
 * }
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';
import { SOCKET_URL } from '../config/api';
import { createInitialState } from '../engine/gameLogic.js';

/**
 * Socket Manager Hook
 * 
 * Handles all socket event subscriptions and updates the Zustand store.
 * Only active when gameConfig.mode is 'web3'.
 */
export function useSocketManager() {
    const socketRef = useRef<Socket | null>(null);

    // Get store values and actions
    const {
        config,
        state,
        setSocket,
        setState,
        setServerMsg,
        setTurnTimer,
        setIsRolling,
        setAppState,
        setConfig,
        setBoardRotation,
    } = useGameStore(useShallow((s) => ({
        config: s.config,
        state: s.state,
        setSocket: s.setSocket,
        setState: s.setState,
        setServerMsg: s.setServerMsg,
        setTurnTimer: s.setTurnTimer,
        setIsRolling: s.setIsRolling,
        setAppState: s.setAppState,
        setConfig: s.setConfig,
        setBoardRotation: s.setBoardRotation,
    })));

    // Get account from outside (passed in or from context)
    // For now we'll use localStorage pattern
    const getMyAddress = useCallback(() => {
        // Try to get from config, or return null
        return config?.players?.find(p => p.address)?.address || null;
    }, [config]);

    useEffect(() => {
        // Only connect for Web3 mode
        if (config?.mode !== 'web3' || !config?.roomId) {
            return;
        }

        console.log('🔌 Initializing socket connection for Web3 match...');

        const socket = io(SOCKET_URL);
        socketRef.current = socket;
        setSocket(socket);

        // ============================================
        // CONNECTION EVENTS
        // ============================================

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id);

            // Join the match room
            const myAddress = getMyAddress();
            if (myAddress && config.roomId) {
                socket.emit('join_match', {
                    roomId: config.roomId,
                    playerAddress: myAddress,
                });
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
            setServerMsg('Connection error. Retrying...');
        });

        // ============================================
        // GAME EVENTS
        // ============================================

        // Game started - initialize local state
        socket.on('game_started', (room) => {
            console.log('🚀 Game started!', room);

            const colorMap: Record<string, number> = {
                'red': 0, 'green': 1, 'yellow': 2, 'blue': 3
            };
            const activeColors = room.players.map((p: any) => colorMap[p.color]);

            // Update config with full room info
            setConfig({
                mode: 'web3',
                roomId: room.id,
                stake: room.stake,
                gameMode: 'classic',
                playerCount: room.players.length,
                players: room.players.map((p: any) => ({
                    id: colorMap[p.color],
                    name: p.name,
                    color: p.color,
                    type: 'human' as const,
                    address: p.address,
                })),
            });

            // Initialize game state
            setState(createInitialState(room.players.length, activeColors));
            setAppState('game');
        });

        // State update from server (authoritative)
        socket.on('state_update', (update) => {
            console.log('📡 State update received');

            if (update.msg) {
                setServerMsg(update.msg);
                // Clear message after 3 seconds
                setTimeout(() => setServerMsg(null), 3000);
            }

            // Trust server state completely
            setState({
                ...update,
                activePlayer: update.activePlayer,
                gamePhase: update.gamePhase,
            });
        });

        // Dice rolled event
        socket.on('dice_rolled', ({ value, playerIndex }) => {
            console.log(`🎲 Player ${playerIndex} rolled ${value}`);
            setIsRolling(true);

            // End rolling animation after delay
            setTimeout(() => {
                setIsRolling(false);
            }, 800);
        });

        // ============================================
        // TIMER EVENTS
        // ============================================

        socket.on('turn_timer_start', ({ playerIndex, timeoutMs, phase }) => {
            const seconds = Math.floor(timeoutMs / 1000);
            setTurnTimer(seconds);
            console.log(`⏰ Timer started: ${seconds}s for Player ${playerIndex}`);
        });

        socket.on('turn_timer_update', ({ remainingSeconds }) => {
            setTurnTimer(remainingSeconds);
        });

        socket.on('turn_timeout', ({ playerName, phase }) => {
            setTurnTimer(0);
            setServerMsg(`⏰ ${playerName} timed out!`);
            console.log(`⏰ Timeout: ${playerName} (${phase})`);

            setTimeout(() => setServerMsg(null), 3000);
        });

        // ============================================
        // CLEANUP
        // ============================================

        return () => {
            console.log('🔌 Cleaning up socket connection...');
            socket.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, [config?.mode, config?.roomId]);

    // ============================================
    // SOCKET ACTIONS
    // ============================================

    const emitRollDice = useCallback((playerAddress: string) => {
        if (!socketRef.current || !config?.roomId) return;

        socketRef.current.emit('roll_dice', {
            roomId: config.roomId,
            playerAddress,
        });
    }, [config?.roomId]);

    const emitMoveToken = useCallback((playerAddress: string, tokenIndex: number) => {
        if (!socketRef.current || !config?.roomId) return;

        socketRef.current.emit('move_token', {
            roomId: config.roomId,
            playerAddress,
            tokenIndex,
        });
    }, [config?.roomId]);

    const emitJoinMatch = useCallback((playerAddress: string) => {
        if (!socketRef.current || !config?.roomId) return;

        socketRef.current.emit('join_match', {
            roomId: config.roomId,
            playerAddress,
        });
    }, [config?.roomId]);

    return {
        socket: socketRef,
        emitRollDice,
        emitMoveToken,
        emitJoinMatch,
    };
}

export default useSocketManager;
