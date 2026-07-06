/**
 * Backend-free on-chain proof of the deployed $GO vault (Coston2).
 * Deployer signs the payout itself (deployer == vault.signer), so no server needed.
 * Proves: config, a full 2-player match, exact 95% payout to the winner, and a real
 * supply burn (totalSupply drops by 2.5% of the pot).
 *
 * ENV: DEPLOYER_PRIVATE_KEY, VAULT_ADDRESS, GO_TOKEN_ADDRESS
 */
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC = "https://coston2-api.flare.network/ext/C/rpc";
const VAULT = process.env.VAULT_ADDRESS;
const GO_TOKEN = process.env.GO_TOKEN_ADDRESS;
const KEY = process.env.DEPLOYER_PRIVATE_KEY;
const opts = { gasPrice: 550000000000n };
const STAKE = ethers.parseEther("1.0");

const provider = new ethers.JsonRpcProvider(RPC, undefined, { staticNetwork: true });
const vaultAbi = JSON.parse(readFileSync(path.join(__dirname, "../src/abi/LudoVault.json"))).abi;
const tokenAbi = [
  "function approve(address,uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
];
const fmt = (v) => Number(ethers.formatEther(v)).toFixed(4);

const A = new ethers.Wallet(KEY, provider); // deployer == signer == treasury == seasonPool
const B = ethers.Wallet.createRandom().connect(provider); // clean winner wallet
const vaultA = new ethers.Contract(VAULT, vaultAbi, A);
const vaultB = new ethers.Contract(VAULT, vaultAbi, B);
const tokenA = new ethers.Contract(GO_TOKEN, tokenAbi, A);
const tokenB = new ethers.Contract(GO_TOKEN, tokenAbi, B);
const tokenR = new ethers.Contract(GO_TOKEN, tokenAbi, provider);
const vaultR = new ethers.Contract(VAULT, vaultAbi, provider);

// ---- Config ----
console.log("=== CONFIG ===");
console.log("totalSupply:", fmt(await tokenR.totalSupply()), "/ MAX:", fmt(await tokenR.MAX_SUPPLY()));
console.log("feeBps:", (await vaultR.feeBps()).toString(), "| affiliateBps:", (await vaultR.affiliateBps()).toString());
console.log("signer:", await vaultR.signer());
console.log("goToken:", await vaultR.goToken(), "(expect", GO_TOKEN + ")");

// ---- Fund B (gas + one stake in $GO) ----
await (await A.sendTransaction({ to: B.address, value: ethers.parseEther("2.0"), ...opts })).wait();
await (await tokenA.transfer(B.address, STAKE, opts)).wait();
await (await tokenA.approve(VAULT, ethers.MaxUint256, opts)).wait();
await (await tokenB.approve(VAULT, ethers.MaxUint256, opts)).wait();
console.log("B funded + approvals set");

// ---- Match: A creates, B joins ----
const roomId = ethers.id("VERIFY_" + Date.now());
await (await vaultA.createRoom(roomId, STAKE, 2n, ethers.ZeroAddress, opts)).wait();
await (await vaultB.joinRoom(roomId, opts)).wait();
const pot = STAKE * 2n;
console.log("Room created + joined | pot:", fmt(pot), "$GO");

// ---- Sign payout for B (winner) with the deployer==signer key ----
const net = await provider.getNetwork();
const domain = { name: "LudoVault", version: "1", chainId: net.chainId, verifyingContract: VAULT };
const types = { Payout: [
  { name: "roomId", type: "bytes32" }, { name: "winner", type: "address" }, { name: "amount", type: "uint256" },
  { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
] };
const nonce = BigInt(ethers.hexlify(ethers.randomBytes(32)));
const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
const sig = await A.signTypedData(domain, types, { roomId, winner: B.address, amount: pot, nonce, deadline });

// ---- Claim + assert ----
const supplyBefore = await tokenR.totalSupply();
const bBefore = await tokenR.balanceOf(B.address);
const rc = await (await vaultB.claimPayout(roomId, B.address, pot, nonce, deadline, sig, opts)).wait();
const supplyAfter = await tokenR.totalSupply();
const bAfter = await tokenR.balanceOf(B.address);

const winnerDelta = bAfter - bBefore;
const burned = supplyBefore - supplyAfter;
const expPayout = (pot * 9500n) / 10000n;   // 95%
const expBurn = (pot * 250n) / 10000n;      // 2.5%
const finished = rc.logs.map((l) => { try { return vaultR.interface.parseLog(l); } catch { return null; } }).find((e) => e?.name === "GameFinished");

console.log("=== MATCH RESULT ===");
console.log("winner $GO Δ:", fmt(winnerDelta), "| expected payout:", fmt(expPayout), winnerDelta === expPayout ? "✅" : "❌");
console.log("burn (totalSupply Δ):", fmt(burned), "| expected:", fmt(expBurn), burned === expBurn ? "✅" : "❌");
console.log("GameFinished event:", finished ? "✅" : "❌");
console.log("totalBurned (vault):", fmt(await vaultR.totalBurned()));

// ---- Return B's leftover gas to A ----
const bal = await provider.getBalance(B.address);
if (bal > ethers.parseEther("0.2")) {
  await (await B.sendTransaction({ to: A.address, value: bal - ethers.parseEther("0.15"), ...opts })).wait();
}

const ok = winnerDelta === expPayout && burned === expBurn && finished;
console.log(ok ? "\n🎉 ON-CHAIN PROOF PASSED — payout + real burn verified on Coston2" : "\n⚠️ mismatch — check log");
process.exit(ok ? 0 : 1);
