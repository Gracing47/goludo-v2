/**
 * Web3 wiring — thirdweb client + contract instances for the ACTIVE chain.
 *
 * G-026a: all chain specifics live in the chain registry (./chains.ts) —
 * this file is chain-agnostic and only binds client + contracts.
 * Legacy export names (coston2, flareTestnet, flareMainnet) are kept as
 * aliases so no consumer breaks; new code should import from ./chains.
 */
import { createThirdwebClient, getContract } from "thirdweb";
import GoTokenABI from "../abi/GoToken.json";
import LudoVaultABI from "../abi/LudoVault.json";
import { CHAIN_REGISTRY, activeChain, activeChainConfig, contractAddressFromEnv } from "./chains";
// PROD-4: Re-export the single currency source-of-truth so consumers can
// import it from web3 without reaching into config/currency directly.
export { NATIVE_CURRENCY_SYMBOL, formatStake } from "./currency";
export { activeChain, activeChainConfig } from "./chains";

// Load from .env via Vite
const clientId = ((import.meta as any).env.VITE_THIRDWEB_CLIENT_ID as string) || "";

if (!clientId) {
    console.warn(
        "⚠️ VITE_THIRDWEB_CLIENT_ID is missing. Wallet connect and on-chain stakes will not " +
        "function until it is configured (see .env.example). Falling back to a placeholder so the " +
        "app still renders for free/local play instead of white-screening."
    );
}

// NOTE: createThirdwebClient throws "clientId or secretKey must be provided" on an empty
// clientId, which crashes the whole app at bootstrap (blank #root). Fall back to a public
// placeholder so the UI always renders; real Web3 calls require a configured clientId.
export const client = createThirdwebClient({
    clientId: clientId || "00000000000000000000000000000000",
});

// ── Legacy aliases (G-026a) — do not use in new code, import from ./chains ──
export const flareMainnet = CHAIN_REGISTRY[14]!.chain;
export const flareTestnet = CHAIN_REGISTRY[114]!.chain;
/** @deprecated alias for the ACTIVE chain (historically Coston2) */
export const coston2 = activeChain;

// Contract Addresses — fail-fast, no silent fallback to a wrong vault (G-024, AAA-M32).
// A hardcoded literal here previously let staked play bind to a stale vault. Refuse that.
function requireContractAddress(name: string, value: unknown): `0x${string}` {
    if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
        throw new Error(
            `[web3] ${name} is missing or not a valid 0x-address for chain ` +
            `${activeChainConfig.label} (${activeChainConfig.id}). ` +
            `Set VITE_${name}_ADDRESS_${activeChainConfig.id} (or legacy VITE_${name}_ADDRESS) in the environment. ` +
            `Refusing to fall back to a hardcoded contract for staked play.`
        );
    }
    return value as `0x${string}`;
}

export const GO_TOKEN_ADDRESS: `0x${string}` = requireContractAddress(
    "GOTOKEN",
    contractAddressFromEnv("GOTOKEN"),
);
export const LUDO_VAULT_ADDRESS: `0x${string}` = requireContractAddress(
    "LUDOVAULT",
    contractAddressFromEnv("LUDOVAULT"),
);

// Contract Instances (v5 style with ABIs for proper error decoding)
export const goTokenContract = getContract({
    client,
    chain: activeChain,
    address: GO_TOKEN_ADDRESS,
    abi: GoTokenABI.abi as any,
});

export const ludoVaultContract = getContract({
    client,
    chain: activeChain,
    address: LUDO_VAULT_ADDRESS,
    abi: LudoVaultABI.abi as any,
});
