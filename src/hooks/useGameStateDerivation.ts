import { useCallback, useMemo } from 'react';
import {
    PLAYER_COLORS,
    MASTER_LOOP,
    HOME_STRETCH_COORDS,
    YARD_COORDS,
    POSITION,
    SAFE_POSITIONS
} from '../engine/constants';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';

export const useGameStateDerivation = (account: any) => {
    const {
        gameState,
        gameConfig,
        isRolling,
        isMoving
    } = useGameStore(useShallow((s) => ({
        gameState: s.state,
        gameConfig: s.config,
        isRolling: s.isRolling,
        isMoving: s.isMoving,
    })));

    // Get token coordinates with stacking info
    const getTokensWithCoords = useCallback(() => {
        if (!gameState || !gameState.tokens || !Array.isArray(gameState.tokens)) {
            return [];
        }

        const cellMap = new Map();

        gameState.tokens.forEach((playerTokens, playerIdx) => {
            if (!Array.isArray(playerTokens)) return;
            playerTokens.forEach((position, tokenIdx) => {
                let coords = null;
                let inYard = false;

                if (position === POSITION.IN_YARD) {
                    coords = YARD_COORDS[playerIdx][tokenIdx];
                    inYard = true;
                } else if (position === POSITION.FINISHED) {
                    const goalCoords = [
                        { r: 6, c: 6 }, // Red (Top Left)
                        { r: 6, c: 8 }, // Green (Top Right)
                        { r: 8, c: 8 }, // Yellow (Bottom Right)
                        { r: 8, c: 6 }  // Blue (Bottom Left)
                    ];
                    coords = goalCoords[playerIdx];
                } else if (position >= 100 && position < 106) {
                    coords = HOME_STRETCH_COORDS[playerIdx][position - 100];
                } else if (position >= 0 && position < MASTER_LOOP.length) {
                    coords = MASTER_LOOP[position];
                }

                if (!coords) return;

                const posKey = inYard ? `yard-${playerIdx}-${tokenIdx}` : `${coords.r}-${coords.c}`;
                if (!cellMap.has(posKey)) cellMap.set(posKey, new Map());

                const playersInCell = cellMap.get(posKey);
                if (!playersInCell.has(playerIdx)) {
                    playersInCell.set(playerIdx, {
                        playerIdx,
                        tokenIndices: [],
                        coords,
                        inYard,
                        position
                    });
                }
                playersInCell.get(playerIdx).tokenIndices.push(tokenIdx);
            });
        });

        const visualTokens = [];
        cellMap.forEach((playersInCell) => {
            const playerIndices = Array.from(playersInCell.keys()).sort((a, b) => a - b);
            const firstGroup = playersInCell.get(playerIndices[0]);

            const isSafePos = SAFE_POSITIONS.includes(firstGroup.position);
            const isYard = firstGroup.inYard;
            const isGoal = firstGroup.position === POSITION.FINISHED;
            const allowStacking = playerIndices.length > 1 || isSafePos || isYard || isGoal;

            const stackSize = allowStacking ? playerIndices.length : 1;

            playerIndices.forEach((playerIdx, stackIndex) => {
                const group = playersInCell.get(playerIdx);
                visualTokens.push({
                    playerIdx: group.playerIdx,
                    tokenIdx: group.tokenIndices[0],
                    tokenCount: group.tokenIndices.length,
                    coords: group.coords,
                    inYard: group.inYard,
                    stackIndex: allowStacking ? stackIndex : 0,
                    stackSize,
                    allTokenIndices: group.tokenIndices
                });
            });
        });

        return visualTokens;
    }, [gameState]);

    const tokensWithCoords = useMemo(() => getTokensWithCoords(), [getTokensWithCoords]);

    const currentPlayer = useMemo(() => {
        if (!gameState || !gameConfig?.players) return null;
        return gameConfig.players[gameState.activePlayer] || null;
    }, [gameConfig?.players, gameState?.activePlayer]);

    const currentColor = useMemo(() => {
        if (!gameState) return null;
        return PLAYER_COLORS[gameState.activePlayer];
    }, [gameState?.activePlayer]);

    const isAITurn = useMemo(() => currentPlayer?.isAI || false, [currentPlayer]);

    const isLocalPlayerTurn = useMemo(() => {
        if (!gameConfig) return false;

        if (gameConfig.mode === 'web3') {
            if (!currentPlayer || !account?.address) return false;
            const currentAddr = currentPlayer?.address?.toLowerCase();
            const myAddr = account.address.toLowerCase();
            return currentAddr === myAddr;
        }

        return !isAITurn;
    }, [gameConfig?.mode, currentPlayer?.address, account?.address, isAITurn]);

    const canRoll = useMemo(() => {
        if (!gameState) return false;
        const phase = gameState.gamePhase;
        const canRollPhase = phase === 'ROLL_DICE' || phase === 'WAITING_FOR_ROLL';
        return canRollPhase && !isRolling && !isMoving && isLocalPlayerTurn;
    }, [gameState?.gamePhase, isRolling, isMoving, isLocalPlayerTurn]);

    return {
        tokensWithCoords,
        currentPlayer,
        currentColor,
        isAITurn,
        isLocalPlayerTurn,
        canRoll
    };
};
