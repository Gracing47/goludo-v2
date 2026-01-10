/**
 * Fast Mode Rules Implementation
 * 
 * Faster-paced Ludo variant with:
 * - 2 tokens per player (quicker games)
 * - Easier starting conditions (4, 5, or 6)
 * - No blockades (faster movement)
 * - Extra roll on capture (more action)
 * - Shorter turn timer (5 seconds)
 * 
 * @implements {IGameRules}
 */

import type { IGameRules, TokenPosition } from '@types/index';

export class FastRules implements IGameRules {
    readonly tokensPerPlayer = 2; // Fewer tokens = faster games
    readonly startingPosition: TokenPosition = 'IN_YARD';
    readonly diceRollsToStart = [4, 5, 6]; // Easier to start
    readonly bonusTurnOn = [6];
    readonly maxConsecutiveSixes = 2; // Reduced from 3
    readonly safeZonesEnabled = true;
    readonly blockadesEnabled = false; // No blockades for faster gameplay
    readonly captureEnabled = true;
    readonly captureBonus = 'EXTRA_ROLL' as const; // Extra roll instead of bonus move
    readonly winCondition = 'ALL_TOKENS_HOME' as const;
    readonly turnTimeLimit = 5000; // 5 seconds (faster turns)
    readonly doubleDice = true; // Roll 2 dice, pick one (optional variant)

    /**
     * Check if player can start a token with given dice roll
     * In fast mode, 4, 5, or 6 allows starting
     */
    canStartWithRoll(diceValue: number): boolean {
        return this.diceRollsToStart.includes(diceValue);
    }

    /**
     * Check if dice value grants a bonus turn
     * In fast mode, only 6 grants another turn
     */
    grantsBonusTurn(diceValue: number): boolean {
        return this.bonusTurnOn.includes(diceValue);
    }

    /**
     * Check if blockades are allowed
     * In fast mode, blockades are disabled for faster gameplay
     */
    isBlockadeAllowed(): boolean {
        return this.blockadesEnabled;
    }

    /**
     * Get the type of bonus granted on capture
     * In fast mode, capturing grants an extra dice roll
     */
    getCaptureBonus(): 'BONUS_MOVE' | 'EXTRA_ROLL' | 'NONE' {
        return this.captureBonus;
    }

    /**
     * Get turn time limit in milliseconds
     * Fast mode has shorter turns (5s vs 10s)
     */
    getTurnTimeLimit(): number {
        return this.turnTimeLimit;
    }
}

// Export singleton instance
export const fastRules = new FastRules();
