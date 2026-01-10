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
export const GO_TOKEN_ADDRESS = import.meta.env.VITE_GOTOKEN_ADDRESS || "0x937667232207904006E88888EB33aCA8E1700688";
export const LUDO_VAULT_ADDRESS = import.meta.env.VITE_LUDOVAULT_ADDRESS || "0xd3EB7151534BBDFcb70352DA8E727B6000966E14";

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
