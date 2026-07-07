/**
 * Chain Registry (G-026a) — SINGLE SOURCE OF TRUTH for every chain GoLudo
 * knows about. State-of-the-art multi-chain pattern: central CHAIN_CONFIGS,
 * chain-specific values isolated here, the rest of the app is chain-agnostic.
 *
 * Adding a chain = one entry here + per-chain contract envs. Nothing else.
 *
 * Active chain selection: VITE_CHAIN_ID (default 114 / Coston2).
 * Contract addresses: VITE_<NAME>_ADDRESS_<CHAINID> wins, falls back to the
 * legacy VITE_<NAME>_ADDRESS (so current deployments keep working unchanged).
 *
 * ⚠️ Mainnet entries exist for completeness but are gated by G-016 (legal).
 * Recommendation for new deploys: CREATE2 so contracts share one address
 * across chains (documented in G-026).
 */
import { defineChain, type Chain } from "thirdweb";

export interface GoLudoChainConfig {
    id: number;
    key: string;
    label: string;
    chain: Chain;
    /** native gas symbol (stakes are always $GO, gas differs per chain) */
    nativeSymbol: string;
    gasFaucetUrl?: string;
    explorerUrl: string;
    testnet: boolean;
}

export const CHAIN_REGISTRY: Record<number, GoLudoChainConfig> = {
    114: {
        id: 114,
        key: "coston2",
        label: "Flare Coston2 Testnet",
        nativeSymbol: "C2FLR",
        gasFaucetUrl: "https://faucet.flare.network/coston2",
        explorerUrl: "https://coston2-explorer.flare.network",
        testnet: true,
        chain: defineChain({
            id: 114,
            name: "Coston2 Testnet",
            nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
            rpcUrls: { default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] } },
            blockExplorers: { default: { name: "Coston2 Explorer", url: "https://coston2-explorer.flare.network" } },
            testnet: true,
        }),
    },
    14: {
        id: 14,
        key: "flare",
        label: "Flare Mainnet",
        nativeSymbol: "FLR",
        explorerUrl: "https://flare-explorer.flare.network",
        testnet: false, // ⚠️ G-016 gate — no contracts configured until legal clearance
        chain: defineChain({
            id: 14,
            name: "Flare Mainnet",
            nativeCurrency: { name: "Flare", symbol: "FLR", decimals: 18 },
            rpcUrls: { default: { http: ["https://flare-api.flare.network/ext/C/rpc"] } },
            blockExplorers: { default: { name: "Flare Explorer", url: "https://flare-explorer.flare.network" } },
        }),
    },
    84532: {
        id: 84532,
        key: "base-sepolia",
        label: "Base Sepolia Testnet",
        nativeSymbol: "ETH",
        gasFaucetUrl: "https://portal.cdp.coinbase.com/products/faucet",
        explorerUrl: "https://sepolia.basescan.org",
        testnet: true, // prepared as the first non-Flare target (G-026b candidate)
        chain: defineChain({
            id: 84532,
            name: "Base Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
            blockExplorers: { default: { name: "Basescan", url: "https://sepolia.basescan.org" } },
            testnet: true,
        }),
    },
};

const env = (import.meta as any).env ?? {};

export const ACTIVE_CHAIN_ID: number = Number(env.VITE_CHAIN_ID ?? 114);

const config = CHAIN_REGISTRY[ACTIVE_CHAIN_ID];
if (!config) {
    throw new Error(
        `[chains] VITE_CHAIN_ID=${ACTIVE_CHAIN_ID} is not in the CHAIN_REGISTRY. ` +
        `Known chains: ${Object.keys(CHAIN_REGISTRY).join(", ")}`
    );
}

export const activeChainConfig: GoLudoChainConfig = config;
export const activeChain: Chain = config.chain;

/** Per-chain contract address lookup with legacy fallback (see header). */
export function contractAddressFromEnv(name: "GOTOKEN" | "LUDOVAULT"): unknown {
    return env[`VITE_${name}_ADDRESS_${ACTIVE_CHAIN_ID}`] ?? env[`VITE_${name}_ADDRESS`];
}
