const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking balance for:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "C2FLR");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
