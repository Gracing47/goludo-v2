const { ethers } = require("hardhat");

/**
 * GoLudo Smart Contract Deployment — $GO ERC-20 Edition (Coston2 Testnet).
 *
 * Deploys:
 *   1. GoToken ($GO) with a faucet reservoir held by the token contract.
 *   2. LudoVault escrowing $GO, with the 5% fee split (50% burn / 30% season / 20% treasury)
 *      and an optional 1% affiliate cut.
 *
 * Env overrides (all optional; default to the deployer for a quick testnet bring-up):
 *   SIGNER_ADDRESS, TREASURY_ADDRESS, SEASON_POOL_ADDRESS
 *   FEE_BPS (default 500 = 5%), AFFILIATE_BPS (default 100 = 1%)
 *   FAUCET_RESERVOIR (whole $GO, default 100,000,000)
 */
async function main() {
    const [deployer] = await ethers.getSigners();

    const signerAddress = process.env.SIGNER_ADDRESS || deployer.address;
    const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
    const seasonPoolAddress = process.env.SEASON_POOL_ADDRESS || deployer.address;
    const feeBps = Number(process.env.FEE_BPS || 500);
    const affiliateBps = Number(process.env.AFFILIATE_BPS || 100);
    const faucetReservoir = ethers.parseEther(process.env.FAUCET_RESERVOIR || "100000000");

    console.log("═══════════════════════════════════════════════════════");
    console.log("        GOLUDO DEPLOYMENT — $GO ERC-20 (Coston2)");
    console.log("═══════════════════════════════════════════════════════");
    console.log("Deployer:      ", deployer.address);
    console.log("Signer:        ", signerAddress);
    console.log("Treasury:      ", treasuryAddress);
    console.log("Season pool:   ", seasonPoolAddress);
    console.log("Fee bps:       ", feeBps, `(${feeBps / 100}%)`);
    console.log("Affiliate bps: ", affiliateBps, `(${affiliateBps / 100}% of pot)`);
    console.log("");

    // 1. GoToken
    console.log("1️⃣  Deploying GoToken ($GO)...");
    const GoToken = await ethers.getContractFactory("GoToken");
    const goToken = await GoToken.deploy(faucetReservoir);
    await goToken.waitForDeployment();
    const goTokenAddress = await goToken.getAddress();
    console.log("   ✅ GoToken:", goTokenAddress);

    // 2. LudoVault
    console.log("2️⃣  Deploying LudoVault ($GO escrow)...");
    const LudoVault = await ethers.getContractFactory("LudoVault");
    const ludoVault = await LudoVault.deploy(
        goTokenAddress,
        signerAddress,
        treasuryAddress,
        seasonPoolAddress,
        feeBps,
        affiliateBps
    );
    await ludoVault.waitForDeployment();
    const vaultAddress = await ludoVault.getAddress();
    console.log("   ✅ LudoVault:", vaultAddress);

    console.log("");
    console.log("═══════════════════════════════════════════════════════");
    console.log("📋 DEPLOYED ADDRESSES (Coston2):");
    console.log("GoToken ($GO):", goTokenAddress);
    console.log("LudoVault:    ", vaultAddress);
    console.log("═══════════════════════════════════════════════════════");
    console.log("");
    console.log("⚠️  Next steps:");
    console.log("   - Set VITE_GO_TOKEN_ADDRESS =", goTokenAddress);
    console.log("   - Set VITE_LUDOVAULT_ADDRESS =", vaultAddress);
    console.log("   - Backend SERVER_SIGNER must match:", signerAddress);
    console.log("   - Players must approve the vault for $GO before staking.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
