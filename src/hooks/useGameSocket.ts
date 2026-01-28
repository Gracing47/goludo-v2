import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';
import { SOCKET_URL } from '../config/api';
import { createInitialState } from '../engine/gameLogic';

/**
 * useGameSocket Hook
 * 
 * Manages the WebSocket connection for multiplayer matches.
 * Handles event listeners and maps server updates to the Zustand store.
 */
export const useGameSocket = (roomId: string | undefined, account: any) => {
    const {
        setSocket,
        gameState,
        gameConfig,
        updateState,
        setGameState,
        setGameConfig,
        setAppState,
        setBoardRotation,
        setServerMsg,
        setTurnTimer,
        setIsRolling,
        setIsMoving,
    } = useGameStore(useShallow((s) => ({
        setSocket: s.setSocket,
        gameState: s.state,
        gameConfig: s.config,
        updateState: s.updateState,
        setGameState: s.setGameState,
        setGameConfig: s.setGameConfig,
        setAppState: s.setAppState,
        setBoardRotation: s.setBoardRotation,
        setServerMsg: s.setServerMsg,
        setTurnTimer: s.setTurnTimer,
        setIsRolling: s.setIsRolling,
        setIsMoving: s.setIsMoving,
    })));

    const socketRef = useRef<Socket | null>(null);

    // 🔗 Socket Initialization & Event Handlers
    const connect = useCallback(() => {
        if (!roomId || !account?.address) return;

        const targetAddr = account.address;

        // Prevent double connection if already active for this room
        if (socketRef.current && socketRef.current.connected) {
            if ((socketRef.current as any)._targetRoom === roomId && (socketRef.current as any)._targetAddr === targetAddr) {
                return;
            }
            socketRef.current.disconnect();
        }

        console.log('🌐 Web3 Match: Connecting to socket...', { roomId, address: targetAddr });

        const socket = io(SOCKET_URL, {
            query: { roomId, userAddress: targetAddr },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });

        // Tag socket for room persistence
        (socket as any)._targetRoom = roomId;
        (socket as any)._targetAddr = targetAddr;

        socket.on('connect', () => {
            console.log('✅ Socket connected! ID:', socket.id);
            socket.emit('join_match', { roomId, playerAddress: targetAddr });
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
            setServerMsg(`📡 Connection error: ${error.message}`);
        });

        socket.on('game_error', (error) => {
            console.error('❌ Game error:', error.message);
            setServerMsg(`❌ ${error.message}`);
            setTimeout(() => setServerMsg(null), 5000);
        });

        socket.on('disconnect', (reason) => {
            console.warn('🔌 Socket disconnected:', reason);
            if (reason === "io server disconnect" || reason === "transport close") {
                setServerMsg("🔌 Connection lost. Reconnecting...");
            }
        });

        socket.on('dice_rolled', ({ value, playerIndex }) => {
            console.log(`🎲 Socket Event: dice_rolled value=${value} for player=${playerIndex}`);
            updateState({ diceValue: value });
            setIsRolling(true);
            if (value !== 6) setServerMsg(null);
            setTimeout(() => setIsRolling(false), 700);
        });

        socket.on('state_update', (update) => {
            if (update.msg) setServerMsg(update.msg);
            updateState(update);
            if (update.gamePhase !== 'ROLL_DICE') {
                setIsRolling(false);
            }
            setIsMoving(false);
        });

        socket.on('turn_timer_start', ({ timeoutMs }) => {
            setTurnTimer(Math.floor(timeoutMs / 1000));
        });

        socket.on('turn_timer_update', ({ remainingMs, remainingSeconds }) => {
            const seconds = remainingSeconds || Math.floor(remainingMs / 1000);
            setTurnTimer(seconds);
        });

        socket.on('pre_game_countdown', ({ room, countdownSeconds, message }) => {
            console.log('🎬 Pre-game countdown received:', countdownSeconds, 's');
            // If game already exists (reconnect), skip countdown
            if (useGameStore.getState().state) return;

            setServerMsg(message);

            setGameConfig({
                mode: 'web3',
                roomId: room.id,
                stake: room.stake,
                playerCount: room.players.filter(p => p).length,
                players: room.players.map((p, idx) => p ? ({
                    id: idx,
                    name: p.name,
                    color: p.color,
                    address: p.address,
                    type: 'human',
                    isAI: false
                }) : null)
            });

            // Perspective rotation
            const myIdx = room.players.findIndex(p =>
                p?.address?.toLowerCase() === account.address?.toLowerCase()
            );
            if (myIdx !== -1) {
                setBoardRotation((3 - myIdx) * 90);
            }
        });

        socket.on('countdown_tick', ({ remaining }) => {
            if (useGameStore.getState().state) return;
            console.log(`⏳ Countdown: ${remaining}s`);
            // We could add a local countdown state if needed, but currently App manages it.
            // For now, let's just use server messages or add a store field later.
        });

        socket.on('game_started', (room) => {
            const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
            const activeColors = room.players
                .map((p, idx) => p ? idx : null)
                .filter(idx => idx !== null);

            setGameConfig({
                mode: 'web3',
                roomId: room.id,
                stake: room.stake,
                playerCount: room.players.filter(p => p).length,
                players: room.players.map((p, idx) => p ? ({
                    id: idx,
                    name: p.name,
                    color: p.color,
                    address: p.address,
                    type: 'human',
                    isAI: false
                }) : null)
            });

            setGameState(createInitialState(4, activeColors));
            setAppState('game');

            const myIdx = room.players.findIndex(p =>
                p?.address?.toLowerCase() === account.address?.toLowerCase()
            );
            if (myIdx !== -1) {
                setBoardRotation((3 - myIdx) * 90);
            }

            const timeout = room.timeoutMs || room.turnTimeout || 30000;
            setTurnTimer(Math.floor(timeout / 1000));
        });

        socket.on('turn_timeout', ({ playerName }) => {
            setTurnTimer(0);
            setServerMsg(`⏰ ${playerName} timed out!`);
            setTimeout(() => setServerMsg(null), 3000);
        });

        socketRef.current = socket;
        setSocket(socket);

        return () => {
            socket.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, [roomId, account?.address, setSocket, updateState, setIsRolling, setServerMsg, setIsMoving, setTurnTimer, setGameConfig, setGameState, setAppState, setBoardRotation]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // 📤 Actions
    const emitRoll = useCallback(() => {
        if (!socketRef.current?.connected) return false;
        socketRef.current.emit('roll_dice', {
            roomId,
            playerAddress: account?.address
        });
        return true;
    }, [roomId, account?.address]);

    const emitMove = useCallback((tokenIndex: number) => {
        if (!socketRef.current?.connected) return false;
        socketRef.current.emit('move_token', {
            roomId,
            playerAddress: account?.address,
            tokenIndex
        });
        return true;
    }, [roomId, account?.address]);

    return {
        socket: socketRef.current,
        isConnected: socketRef.current?.connected ?? false,
        connect,
        emitRoll,
        emitMove
    };
};
