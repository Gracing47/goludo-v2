import { createThirdwebClient, getContract, defineChain } from "thirdweb";

// Load from .env via Vite
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!clientId) {
    console.error("VITE_THIRDWEB_CLIENT_ID is missing in .env");
}

export const client = createThirdwebClient({
    clientId: clientId,
});

// Chain definition for Coston2
export const coston2 = defineChain(114);

// Contract Addresses
export const GO_TOKEN_ADDRESS = import.meta.env.VITE_GOTOKEN_ADDRESS || "0x50787A6A4cEA4f3eFeA653D82eA8629DBF634C13";
export const LUDO_VAULT_ADDRESS = import.meta.env.VITE_LUDOVAULT_ADDRESS || "0x50787A6A4cEA4f3eFeA653D82eA8629DBF634C13";

// Contract Instances (v5 style)
export const goTokenContract = getContract({
    client,
    chain: coston2,
    address: GO_TOKEN_ADDRESS,
});

export const ludoVaultContract = getContract({
    client,
    chain: coston2,
    address: LUDO_VAULT_ADDRESS,
});
