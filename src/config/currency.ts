/**
 * Single source of truth for the native stake-currency label shown in the UI.
 *
 * The app currently targets Flare Coston2 testnet (native symbol "C2FLR").
 * Switch NATIVE_CURRENCY_SYMBOL to "FLR" for Flare mainnet.
 *
 * Replaces hardcoded "ETH" strings scattered across the UI (Leo LEO-D2:
 * one consistent currency story rendered from one place).
 */
export const NATIVE_CURRENCY_SYMBOL = 'C2FLR' as const;

/**
 * G-025: stakes moved from native coin to the $GO token (vault escrows via
 * transferFrom). Native currency is now gas-only; stakes render in $GO.
 * On a future multi-chain launch both symbols swap per target chain.
 */
export const STAKE_CURRENCY_SYMBOL = 'GO' as const;

/** Format a stake/pot amount with the stake currency symbol, e.g. "0.1 GO". */
export function formatStake(amount: string | number): string {
    return `${amount} ${STAKE_CURRENCY_SYMBOL}`;
}
