/**
 * Classic Ludo Rules Implementation
 * 
 * Traditional Ludo rules with:
 * - 4 tokens per player
 * - Safe zones and blockades
 * - Bonus turn on 6
 * - Capture mechanics
 * 
 * @implements {IGameRules}
 */

import type { IGameRules, TokenPosition } from '@types/index';

export class ClassicRules implements IGameRules {
    readonly tokensPerPlayer = 4;
    readonly startingPosition: TokenPosition = 'IN_YARD';
    readonly diceRollsToStart = [6];
    readonly bonusTurnOn = [6];
    readonly maxConsecutiveSixes = 3;
    readonly safeZonesEnabled = true;
    readonly blockadesEnabled = true;
    readonly captureEnabled = true;
    readonly captureBonus = 'BONUS_MOVE' as const;
    readonly winCondition = 'ALL_TOKENS_HOME' as const;
    readonly turnTimeLimit = 10000; // 10 seconds

    /**
     * Check if player can start a token with given dice roll
     * In classic mode, only a 6 allows starting
     */
    canStartWithRoll(diceValue: number): boolean {
        return this.diceRollsToStart.includes(diceValue);
    }

    /**
     * Check if dice value grants a bonus turn
     * In classic mode, rolling a 6 grants another turn
     */
    grantsBonusTurn(diceValue: number): boolean {
        return this.bonusTurnOn.includes(diceValue);
    }

    /**
     * Check if blockades are allowed
     * In classic mode, blockades are enabled
     */
    isBlockadeAllowed(): boolean {
        return this.blockadesEnabled;
    }

    /**
     * Get the type of bonus granted on capture
     * In classic mode, capturing grants a bonus move
     */
    getCaptureBonus(): 'BONUS_MOVE' | 'EXTRA_ROLL' | 'NONE' {
        return this.captureBonus;
    }

    /**
     * Get turn time limit in milliseconds
     */
    getTurnTimeLimit(): number {
        return this.turnTimeLimit;
    }
}

// Export singleton instance
export const classicRules = new ClassicRules();
