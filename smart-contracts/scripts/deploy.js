const { ethers } = require("hardhat");

/**
 * GoLudo Smart Contract Deployment Script (Native Currency Version)
 */
async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("═══════════════════════════════════════════════════════");
    console.log("           GOLUDO CONTRACT DEPLOYMENT (NATIVE)");
    console.log("═══════════════════════════════════════════════════════");
    console.log("Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatUnits(balance, 18), "C2FLR");
    console.log("");

    // 1. Deploy LudoVault (Native Version)
    console.log("1️⃣  Deploying LudoVault (Native)...");
    const signerAddress = deployer.address; // Backend signer (for testing we use deployer)
    const treasuryAddress = deployer.address;
    const initialFeeBps = 250; // 2.5%

    const LudoVault = await ethers.getContractFactory("LudoVault");
    const ludoVault = await LudoVault.deploy(
        signerAddress,
        treasuryAddress,
        initialFeeBps
    );
    await ludoVault.waitForDeployment();
    const vaultAddress = await ludoVault.getAddress();
    console.log("   ✅ LudoVault deployed to:", vaultAddress);

    console.log("");
    console.log("═══════════════════════════════════════════════════════");
    console.log("📋 DEPLOYED ADDRESSES:");
    console.log("LudoVault (Native): ", vaultAddress);
    console.log("═══════════════════════════════════════════════════════");
    console.log("");
    console.log("⚠️  Action Required: Update your .env and VITE_LUDOVAULT_ADDRESS");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
