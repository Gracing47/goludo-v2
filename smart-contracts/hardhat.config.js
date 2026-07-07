require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.25",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            viaIR: true,
        },
    },
    networks: {
        hardhat: {
            chainId: 31337,
        },
        coston2: {
            url: "https://coston2-api.flare.network/ext/C/rpc",
            chainId: 114,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            gasPrice: 550000000000, // Coston2 pool minimum is ~500 gwei; 25 gwei is rejected as underpriced
        },
        flare: {
            url: "https://flare-api.flare.network/ext/C/rpc",
            chainId: 14,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            gasPrice: 25000000000,
        },
        // G-026b: per-chain deployer keys (blast-radius rule) — falls back to
        // DEPLOYER_PRIVATE_KEY only if the chain-specific env is unset.
        baseSepolia: {
            url: "https://sepolia.base.org",
            chainId: 84532,
            accounts: (process.env.DEPLOYER_PRIVATE_KEY_84532 || PRIVATE_KEY) ? [process.env.DEPLOYER_PRIVATE_KEY_84532 || PRIVATE_KEY] : [],
        },
        celoSepolia: {
            url: "https://forno.celo-sepolia.celo-testnet.org",
            chainId: 11142220,
            accounts: (process.env.DEPLOYER_PRIVATE_KEY_11142220 || PRIVATE_KEY) ? [process.env.DEPLOYER_PRIVATE_KEY_11142220 || PRIVATE_KEY] : [],
        },
    },
    etherscan: {
        apiKey: {
            coston2: "no-api-key-needed",
            flare: "no-api-key-needed",
        },
        customChains: [
            {
                network: "coston2",
                chainId: 114,
                urls: {
                    apiURL: "https://coston2-explorer.flare.network/api",
                    browserURL: "https://coston2-explorer.flare.network",
                },
            },
            {
                network: "flare",
                chainId: 14,
                urls: {
                    apiURL: "https://flare-explorer.flare.network/api",
                    browserURL: "https://flare-explorer.flare.network",
                },
            },
        ],
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};
