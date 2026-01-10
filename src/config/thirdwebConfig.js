/**
 * THIRDWEB + FLARE NETWORK CONFIGURATION
 * 
 * GoLudo Web3 Integration
 */

import { createThirdwebClient, defineChain } from "thirdweb";

// Thirdweb Client (public client for read operations)
export const client = createThirdwebClient({
    clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "demo-client"
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

// Default to testnet for development
export const defaultChain = flareTestnet;

// Supported chains
export const supportedChains = [flareMainnet, flareTestnet];
