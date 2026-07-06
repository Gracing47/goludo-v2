/**
 * Shared formatting helpers (Audit C2 — was duplicated in 4 components).
 */

/**
 * wei string/bigint → human $GO string.
 * BigInt-safe split (12+6 digits): no precision loss up to ~9 billion $GO.
 */
export function weiToGo(wei: unknown, maxFractionDigits: number = 2): string {
    try {
        const n = Number(BigInt(String(wei ?? 0)) / 10n ** 12n) / 1e6;
        return n.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
    } catch {
        return '0';
    }
}

/** 0x… address → 0x1234…abcd */
export function shortAddr(a?: string | null): string {
    return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—';
}
