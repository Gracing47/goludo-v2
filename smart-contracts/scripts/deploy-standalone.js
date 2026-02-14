const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc");
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

    if (!privateKey) {
        console.error("❌ DEPLOYER_PRIVATE_KEY missing in .env");
        return;
    }

    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("═══════════════════════════════════════════════════════");
    console.log("      GOLUDO NATIVE DEPLOYMENT (STANDALONE)");
    console.log("═══════════════════════════════════════════════════════");
    console.log("Deployer:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", ethers.formatUnits(balance, 18), "C2FLR");
    console.log("");

    // Load artifact
    const ludoVaultPath = path.join(__dirname, "../artifacts/contracts/LudoVault.sol/LudoVault.json");
    if (!fs.existsSync(ludoVaultPath)) {
        console.error("❌ LudoVault artifact not found. Please run 'npx hardhat compile' first.");
        return;
    }
    const ludoVaultArtifact = JSON.parse(fs.readFileSync(ludoVaultPath, "utf8"));

    // 2. Deploy LudoVault
    console.log("🚀 Deploying LudoVault (Native)...");
    const LudoVaultFactory = new ethers.ContractFactory(ludoVaultArtifact.abi, ludoVaultArtifact.bytecode, wallet);

    // Constructor arguments for Native version
    const signerAddress = wallet.address;
    const treasuryAddress = wallet.address;
    const initialFeeBps = 250; // 2.5%

    try {
        const ludoVault = await LudoVaultFactory.deploy(
            signerAddress,
            treasuryAddress,
            initialFeeBps
        );
        console.log(`   Transaction Sent: ${ludoVault.deploymentTransaction().hash}`);
        console.log("   Waiting for confirmation...");

        await ludoVault.waitForDeployment();
        const vaultAddress = await ludoVault.getAddress();

        console.log("");
        console.log("   ✅ LudoVault deployed to:", vaultAddress);

        console.log("");
        console.log("═══════════════════════════════════════════════════════");
        console.log("📋 DEPLOYED ADDRESSES:");
        console.log("LudoVault (Native): ", vaultAddress);
        console.log("═══════════════════════════════════════════════════════");
        console.log("");
        console.log("➡️  Update your frontend .env with this address!");
    } catch (error) {
        console.error("❌ Deployment failed:", error);
    }
}

main().catch(console.error);
