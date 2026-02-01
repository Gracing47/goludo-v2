import { createThirdwebClient, getContract, defineChain } from "thirdweb";
import GoTokenABI from "../abi/GoToken.json";
import LudoVaultABI from "../abi/LudoVault.json";

// Load from .env via Vite
const clientId = (import.meta as any).env.VITE_THIRDWEB_CLIENT_ID as string | undefined;

if (!clientId) {
    console.error("VITE_THIRDWEB_CLIENT_ID is missing in .env");
}

export const client = createThirdwebClient({
    clientId: clientId || '',
});

// Chain definition for Coston2
export const coston2 = defineChain(114);

// Contract Addresses
export const GO_TOKEN_ADDRESS: `0x${string}` = ((import.meta as any).env.VITE_GOTOKEN_ADDRESS || "0x50787A6A4cEA4f3eFeA653D82eA8629DBF634C13") as `0x${string}`;
export const LUDO_VAULT_ADDRESS: `0x${string}` = ((import.meta as any).env.VITE_LUDOVAULT_ADDRESS || "0x50787A6A4cEA4f3eFeA653D82eA8629DBF634C13") as `0x${string}`;

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
