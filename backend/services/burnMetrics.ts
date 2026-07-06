/**
 * Burn metrics service — feeds the "Total $GO Deflated" ticker.
 *
 * Reads the deflation state from chain:
 *   - vault.totalBurned()  = cumulative $GO burned via match fee splits
 *   - token.MAX_SUPPLY() - token.totalSupply() = ALL burns (fees + any manual burn)
 *
 * Cached for 30s to shield the RPC from the ticker's polling. Degrades gracefully:
 * if the RPC / addresses are unset (e.g. contracts not deployed yet) it returns
 * { available: false, ... } instead of throwing, so the endpoint never 500s.
 */

import { ethers } from 'ethers';

const RPC_URL = process.env.FLARE_RPC_URL;
const VAULT_ADDRESS = process.env.VITE_LUDOVAULT_ADDRESS || process.env.LUDOVAULT_ADDRESS;
// Canonical env name is GOTOKEN_ADDRESS (no underscore), matching the frontend
// VITE_GOTOKEN_ADDRESS and deploy scripts. Keep the underscored names as a fallback.
const GO_TOKEN_ADDRESS = process.env.VITE_GOTOKEN_ADDRESS || process.env.GOTOKEN_ADDRESS
    || process.env.VITE_GO_TOKEN_ADDRESS || process.env.GO_TOKEN_ADDRESS;

const VAULT_ABI = ['function totalBurned() view returns (uint256)'];
const TOKEN_ABI = [
    'function totalSupply() view returns (uint256)',
    'function MAX_SUPPLY() view returns (uint256)',
];

const CACHE_TTL_MS = 30_000;

export interface BurnMetrics {
    available: boolean;
    totalBurned: string;       // via vault fee splits
    burnedTotal: string;       // ALL burns (maxSupply - circulating)
    maxSupply: string;
    circulatingSupply: string;
    burnedPercent: number;     // burnedTotal / maxSupply * 100
    updatedAt: number;
}

function fallback(): BurnMetrics {
    return {
        available: false,
        totalBurned: '0',
        burnedTotal: '0',
        maxSupply: '0',
        circulatingSupply: '0',
        burnedPercent: 0,
        updatedAt: Date.now(),
    };
}

let provider: ethers.JsonRpcProvider | null = null;
function getProvider(): ethers.JsonRpcProvider | null {
    if (!RPC_URL) return null;
    if (!provider) provider = new ethers.JsonRpcProvider(RPC_URL);
    return provider;
}

let cache: { at: number; data: BurnMetrics } | null = null;

export async function getBurnMetrics(): Promise<BurnMetrics> {
    const now = Date.now();
    if (cache && now - cache.at < CACHE_TTL_MS) return cache.data;

    const p = getProvider();
    if (!p || !VAULT_ADDRESS || !GO_TOKEN_ADDRESS) return fallback();

    try {
        const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, p);
        const token = new ethers.Contract(GO_TOKEN_ADDRESS, TOKEN_ABI, p);

        const [burned, supply, maxSupply] = await Promise.all([
            vault.totalBurned() as Promise<bigint>,
            token.totalSupply() as Promise<bigint>,
            token.MAX_SUPPLY() as Promise<bigint>,
        ]);

        const burnedTotal = maxSupply > supply ? maxSupply - supply : 0n;
        const burnedPercent =
            maxSupply > 0n ? Number((burnedTotal * 10000n) / maxSupply) / 100 : 0;

        const data: BurnMetrics = {
            available: true,
            totalBurned: burned.toString(),
            burnedTotal: burnedTotal.toString(),
            maxSupply: maxSupply.toString(),
            circulatingSupply: supply.toString(),
            burnedPercent,
            updatedAt: now,
        };
        cache = { at: now, data };
        return data;
    } catch (e: any) {
        console.warn('[burnMetrics] chain read failed:', e?.message);
        return fallback();
    }
}
