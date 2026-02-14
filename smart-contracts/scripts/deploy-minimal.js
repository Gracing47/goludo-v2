const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc");
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

    const ludoVaultPath = path.join(__dirname, "../artifacts/contracts/LudoVault.sol/LudoVault.json");
    const ludoVaultArtifact = JSON.parse(fs.readFileSync(ludoVaultPath, "utf8"));

    const LudoVaultFactory = new ethers.ContractFactory(ludoVaultArtifact.abi, ludoVaultArtifact.bytecode, wallet);

    const ludoVault = await LudoVaultFactory.deploy(wallet.address, wallet.address, 250);
    await ludoVault.waitForDeployment();
    console.log("DEPLOYED_ADDRESS=" + await ludoVault.getAddress());
}

main().catch(console.error);
