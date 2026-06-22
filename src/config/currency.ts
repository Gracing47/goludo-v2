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

/** Format a stake/pot amount with the native currency symbol, e.g. "0.1 C2FLR". */
export function formatStake(amount: string | number): string {
    return `${amount} ${NATIVE_CURRENCY_SYMBOL}`;
}
