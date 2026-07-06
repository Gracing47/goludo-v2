import { createThirdwebClient, getContract, defineChain } from "thirdweb";
import GoTokenABI from "../abi/GoToken.json";
import LudoVaultABI from "../abi/LudoVault.json";
// PROD-4: Re-export the single currency source-of-truth so consumers can
// import it from web3 without reaching into config/currency directly.
export { NATIVE_CURRENCY_SYMBOL, formatStake } from "./currency";

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

// Flare Mainnet Configuration
export const flareMainnet = defineChain({
    id: 14,
    name: "Flare Mainnet",
    nativeCurrency: {
        name: "Flare",
        symbol: "FLR",
        decimals: 18
    },
    rpcUrls: {
        default: {
            http: ["https://flare-api.flare.network/ext/C/rpc"]
        }
    },
    blockExplorers: {
        default: {
            name: "Flare Explorer",
            url: "https://flare-explorer.flare.network"
        }
    }
});

// Flare Coston2 Testnet Configuration
export const flareTestnet = defineChain({
    id: 114,
    name: "Coston2 Testnet",
    nativeCurrency: {
        name: "Coston2 Flare",
        symbol: "C2FLR",
        decimals: 18
    },
    rpcUrls: {
        default: {
            http: ["https://coston2-api.flare.network/ext/C/rpc"]
        }
    },
    blockExplorers: {
        default: {
            name: "Coston2 Explorer",
            url: "https://coston2-explorer.flare.network"
        }
    },
    testnet: true
});

// Alias for coston2 for compatibility
export const coston2 = flareTestnet;

// Contract Addresses — fail-fast, no silent fallback to a wrong vault (G-024, AAA-M32).
// A hardcoded literal here previously let staked play bind to a stale vault. Refuse that.
function requireContractAddress(name: string, value: unknown): `0x${string}` {
    if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
        throw new Error(
            `[web3] ${name} is missing or not a valid 0x-address. ` +
            `Set it in the environment (Vercel / Railway / .env). ` +
            `Refusing to fall back to a hardcoded contract for staked play.`
        );
    }
    return value as `0x${string}`;
}

export const GO_TOKEN_ADDRESS: `0x${string}` = requireContractAddress(
    "VITE_GOTOKEN_ADDRESS",
    (import.meta as any).env.VITE_GOTOKEN_ADDRESS,
);
export const LUDO_VAULT_ADDRESS: `0x${string}` = requireContractAddress(
    "VITE_LUDOVAULT_ADDRESS",
    (import.meta as any).env.VITE_LUDOVAULT_ADDRESS,
);

// Contract Instances (v5 style with ABIs for proper error decoding)
export const goTokenContract = getContract({
    client,
    chain: coston2,
    address: GO_TOKEN_ADDRESS,
    abi: GoTokenABI.abi as any,
});

export const ludoVaultContract = getContract({
    client,
    chain: coston2,
    address: LUDO_VAULT_ADDRESS,
    abi: LudoVaultABI.abi as any,
});
