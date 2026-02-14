import { createThirdwebClient, getContract, defineChain } from "thirdweb";
import GoTokenABI from "../abi/GoToken.json";
import LudoVaultABI from "../abi/LudoVault.json";

// Load from .env via Vite
const clientId = (import.meta as any).env.VITE_THIRDWEB_CLIENT_ID as string || "";

if (!clientId) {
    console.warn("⚠️ VITE_THIRDWEB_CLIENT_ID is missing! Social login will be extremely slow or fail.");
}

export const client = createThirdwebClient({
    clientId,
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

// Contract Addresses
export const GO_TOKEN_ADDRESS: `0x${string}` = ((import.meta as any).env.VITE_GOTOKEN_ADDRESS || "0x50787A6A4cEA4f3eFeA653D82eA8629DBF634C13") as `0x${string}`;
export const LUDO_VAULT_ADDRESS: `0x${string}` = ((import.meta as any).env.VITE_LUDOVAULT_ADDRESS || "0xa8d47bE166B677125BD28a1d94FF087d4B45923a") as `0x${string}`;

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
