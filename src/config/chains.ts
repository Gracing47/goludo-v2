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
        testnet: true, // G-026b target #1 (Thomas-approved 07.07.)
        chain: defineChain({
            id: 84532,
            name: "Base Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
            blockExplorers: { default: { name: "Basescan", url: "https://sepolia.basescan.org" } },
            testnet: true,
        }),
    },
    11142220: {
        id: 11142220,
        key: "celo-sepolia",
        label: "Celo Sepolia Testnet",
        nativeSymbol: "CELO-S",
        gasFaucetUrl: "https://faucet.celo.org/",
        explorerUrl: "https://celo-sepolia.blockscout.com",
        testnet: true, // G-026b target #2 (Thomas-approved 07.07.; replaces deprecated Alfajores)
        chain: defineChain({
            id: 11142220,
            name: "Celo Sepolia",
            nativeCurrency: { name: "Celo Sepolia", symbol: "CELO-S", decimals: 18 },
            rpcUrls: { default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] } },
            blockExplorers: { default: { name: "Celo Sepolia Blockscout", url: "https://celo-sepolia.blockscout.com" } },
            testnet: true,
        }),
    },
};

const env = (import.meta as any).env ?? {};

/** Does this chain have contracts configured? (per-chain env, legacy only for 114) */
export function chainHasContracts(id: number): boolean {
    const per = (n: string) => typeof env[`VITE_${n}_ADDRESS_${id}`] === "string" && env[`VITE_${n}_ADDRESS_${id}`].length > 0;
    if (per("GOTOKEN") && per("LUDOVAULT")) return true;
    return id === 114 && !!env.VITE_GOTOKEN_ADDRESS && !!env.VITE_LUDOVAULT_ADDRESS;
}

// G-026b: runtime chain selection — the user switches chains in the UI.
// Stored in localStorage; a full reload re-initializes every module-level
// contract binding cleanly (deliberate: no half-switched state, ever).
const STORAGE_KEY = "goludo_chain_id";
function resolveActiveChainId(): number {
    const envDefault = Number(env.VITE_CHAIN_ID || 114); // || not ??: empty string must not become 0 (Daniel N6)
    try {
        const stored = Number(localStorage.getItem(STORAGE_KEY) || "");
        if (stored > 0 && CHAIN_REGISTRY[stored] && chainHasContracts(stored)) return stored;
        if (stored > 0) localStorage.removeItem(STORAGE_KEY); // stale/broken selection → home chain
    } catch { /* SSR/no storage */ }
    return envDefault;
}

export const ACTIVE_CHAIN_ID: number = resolveActiveChainId();

/** Chains the user may pick in the UI: testnets with configured contracts. */
export function selectableChains(): GoLudoChainConfig[] {
    return Object.values(CHAIN_REGISTRY).filter(c => c.testnet && chainHasContracts(c.id));
}

/** Switch the active chain (persists + reloads — see note above). */
export function switchActiveChain(id: number): void {
    if (!CHAIN_REGISTRY[id] || !chainHasContracts(id)) throw new Error(`Chain ${id} is not available`);
    try { localStorage.setItem(STORAGE_KEY, String(id)); } catch { /* best-effort */ }
    window.location.reload();
}

const config = CHAIN_REGISTRY[ACTIVE_CHAIN_ID];
if (!config) {
    throw new Error(
        `[chains] VITE_CHAIN_ID=${ACTIVE_CHAIN_ID} is not in the CHAIN_REGISTRY. ` +
        `Known chains: ${Object.keys(CHAIN_REGISTRY).join(", ")}`
    );
}

export const activeChainConfig: GoLudoChainConfig = config;
export const activeChain: Chain = config.chain;

/**
 * Per-chain contract address lookup.
 * Daniel G-026a-B1: the legacy fallback (VITE_<NAME>_ADDRESS) is ONLY valid on
 * Coston2 (114) — on any other chain a missing per-chain env must fail fast,
 * otherwise staked play would silently bind to the Coston2 address on a
 * foreign chain (exactly the G-024/AAA-M32 failure mode).
 */
export function contractAddressFromEnv(name: "GOTOKEN" | "LUDOVAULT"): unknown {
    return env[`VITE_${name}_ADDRESS_${ACTIVE_CHAIN_ID}`]
        ?? (ACTIVE_CHAIN_ID === 114 ? env[`VITE_${name}_ADDRESS`] : undefined);
}
