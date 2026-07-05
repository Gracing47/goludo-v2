/**
 * E2E: kompletter 2-Spieler-Web3-Match-Durchlauf auf der $GO-Kette inkl.
 * Payout-Claim, Fee-Split-Beweis und Burn-Beweis.
 *
 * Gegenüber der nativen Vorversion:
 *  - Stakes laufen in $GO (ERC-20) via approve + transferFrom, nicht als msg.value.
 *  - createRoom(roomId, amount, maxPlayers, affiliate)  (affiliate = ZeroAddress hier).
 *  - Fee ist 5%: Winner erhält 95% des Pots. Der Contract splittet die Fee
 *    50/30/20 (Burn/Season/Treasury) und BURNT seinen Anteil → totalSupply sinkt.
 *  - Assertions: Winner-$GO-Delta == 95% Pot  UND  totalSupply-Delta == 2,5% Pot (Burn).
 *
 * ENV (Testnet only):
 *   DIAG_KEY           funded Coston2-Testkey (Wallet A; muss $GO halten oder faucen)
 *   VAULT_ADDRESS      deployte LudoVault ($GO edition)
 *   GO_TOKEN_ADDRESS   deployter GoToken ($GO)
 * Aufruf:  DIAG_KEY=… VAULT_ADDRESS=0x… GO_TOKEN_ADDRESS=0x… node scripts/e2e-full-match.mjs
 */
import { ethers } from "ethers";
import { io } from "socket.io-client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC = process.env.FLARE_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
const API = process.env.API_URL || "https://goludo-v2-production.up.railway.app";
const VAULT = process.env.VAULT_ADDRESS;
const GO_TOKEN = process.env.GO_TOKEN_ADDRESS;
const STAKE = "0.5";
const MODE = "rapid"; // first-to-1 → kürzestes Match

if (!VAULT || !GO_TOKEN) { console.error("VAULT_ADDRESS und GO_TOKEN_ADDRESS müssen gesetzt sein (deploy zuerst)"); process.exit(1); }

const provider = new ethers.JsonRpcProvider(RPC, undefined, { staticNetwork: true });
const vaultAbi = JSON.parse(readFileSync(path.join(__dirname, "../src/abi/LudoVault.json"), "utf8")).abi;
const tokenAbi = [
  "function approve(address,uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function faucet()",
];

const keyA = process.env.DIAG_KEY;
if (!keyA) { console.error("DIAG_KEY fehlt"); process.exit(1); }
const walletA = new ethers.Wallet(keyA, provider);
const walletB = ethers.Wallet.createRandom().connect(provider);
const vaultA = new ethers.Contract(VAULT, vaultAbi, walletA);
const vaultB = new ethers.Contract(VAULT, vaultAbi, walletB);
const tokenA = new ethers.Contract(GO_TOKEN, tokenAbi, walletA);
const tokenB = new ethers.Contract(GO_TOKEN, tokenAbi, walletB);
const tokenR = new ethers.Contract(GO_TOKEN, tokenAbi, provider);
const ZERO = ethers.ZeroAddress;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const fmt = (v) => Number(ethers.formatEther(v)).toFixed(4);
const stakeWei = ethers.parseEther(STAKE);

// ---------- Setup: B mit C2FLR (Gas) + $GO (Stake) versorgen, beide approven ----------
log("A:", walletA.address, fmt(await provider.getBalance(walletA.address)), "C2FLR |", fmt(await tokenA.balanceOf(walletA.address)), "$GO");

// A braucht mind. 2 Stakes $GO; sonst faucet versuchen.
if (await tokenA.balanceOf(walletA.address) < stakeWei * 2n) {
  log("A hat wenig $GO — faucet…");
  try { await (await tokenA.faucet()).wait(); } catch (e) { log("faucet fehlgeschlagen (Cooldown/leer):", e.shortMessage || e.message); }
}

const fundTx = await walletA.sendTransaction({ to: walletB.address, value: ethers.parseEther("1.0") });
await fundTx.wait();
await (await tokenA.transfer(walletB.address, stakeWei)).wait();
log("B:", walletB.address, fmt(await provider.getBalance(walletB.address)), "C2FLR |", fmt(await tokenB.balanceOf(walletB.address)), "$GO (frisch versorgt)");

await (await tokenA.approve(VAULT, ethers.MaxUint256)).wait();
await (await tokenB.approve(VAULT, ethers.MaxUint256)).wait();
log("approve(vault) für A und B gesetzt");

const supplyBefore = await tokenR.totalSupply();

// ---------- Raum: on-chain ($GO) + Backend (exakt der Frontend-Flow) ----------
const roomId = ethers.id("E2E_" + Date.now());
const roomIdLc = roomId.toLowerCase();

log("A createRoom on-chain ($GO)…");
const createTx = await vaultA.createRoom(roomId, stakeWei, 2n, ZERO);
await createTx.wait();
let res = await fetch(`${API}/api/rooms/create`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ roomId, txHash: createTx.hash, stake: STAKE, maxPlayers: 2, creatorName: "E2E-Alice", creatorAddress: walletA.address, color: "red", mode: MODE }),
});
log("  Backend create:", res.status, (await res.text()).slice(0, 100));
if (res.status !== 200) process.exit(1);

log("B joinRoom on-chain ($GO)…");
const joinTx = await vaultB.joinRoom(roomId);
await joinTx.wait();
res = await fetch(`${API}/api/rooms/join`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ roomId, txHash: joinTx.hash, playerName: "E2E-Bob", playerAddress: walletB.address, color: "blue" }),
});
log("  Backend join:", res.status, (await res.text()).slice(0, 100));
if (res.status !== 200) process.exit(1);

// ---------- Sockets + datengetriebener Auto-Play ----------
const result = { started: false, winnerIdx: null, winnerAddr: null, winAt: null, moves: 0 };

function makePlayer(name, wallet) {
  const socket = io(API, { query: { roomId: roomIdLc, userAddress: wallet.address }, transports: ["websocket", "polling"] });
  const p = { name, wallet, socket, idx: null, addrByIdx: {} };
  let lastActionKey = "";

  socket.on("connect", () => { socket.emit("join_match", { roomId: roomIdLc, playerAddress: wallet.address }); });
  socket.on("game_error", (e) => log(`[${name}] game_error:`, e?.message));

  const captureRoster = (room) => {
    p.idx = room.players.findIndex((x) => x && x.address?.toLowerCase() === wallet.address.toLowerCase());
    room.players.forEach((x, i) => { if (x) p.addrByIdx[i] = x.address; });
  };
  socket.on("game_started", (room) => { if (!result.started) { result.started = true; log(`game_started (Roster: ${room.players.filter(Boolean).map(x => x.name).join(" vs ")})`); } captureRoster(room); });
  socket.on("pre_game_countdown", ({ room }) => captureRoster(room));

  socket.on("state_update", (u) => {
    if (result.winnerIdx !== null) return;
    if (u.gamePhase === "WIN" && u.winner !== undefined && u.winner !== null) {
      result.winnerIdx = u.winner;
      result.winnerAddr = p.addrByIdx[u.winner] || null;
      result.winAt = Date.now();
      log(`🏁 WIN erkannt — Spieler-Index ${u.winner} (${result.winnerAddr})`);
      return;
    }
    if (p.idx === null) return;
    const turn = u.currentTurn ?? u.activePlayer;
    if (turn !== p.idx) return;

    const key = `${u.gamePhase}|${u.turnState}|${u.lastDice}|${JSON.stringify(u.validMoves || [])}`;
    if (key === lastActionKey) return;
    lastActionKey = key;

    if (u.gamePhase === "ROLL_DICE" || String(u.turnState || "").includes("ROLL")) {
      result.moves++;
      setTimeout(() => socket.emit("roll_dice", { roomId: roomIdLc, playerAddress: wallet.address }), 200);
    } else if (Array.isArray(u.validMoves) && u.validMoves.length > 0) {
      const mv = u.validMoves[0];
      const tokenIndex = typeof mv === "object" ? (mv.tokenIndex ?? mv.token ?? 0) : mv;
      setTimeout(() => socket.emit("move_token", { roomId: roomIdLc, playerAddress: wallet.address, tokenIndex }), 200);
    }
  });
  return p;
}

const A = makePlayer("Alice", walletA);
const B = makePlayer("Bob", walletB);

// ---------- Warten bis Sieg ----------
const deadline = Date.now() + 10 * 60 * 1000;
let lastLog = 0;
while (result.winnerIdx === null && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 1000));
  if (Date.now() - lastLog > 30000) { lastLog = Date.now(); log(`… Match läuft (${result.moves} Würfe)`); }
}
A.socket.disconnect(); B.socket.disconnect();
if (result.winnerIdx === null) { log("❌ TIMEOUT — kein WIN binnen 10 Min"); process.exit(1); }

// ---------- PayoutProof per HTTP holen ----------
log("POST /api/payout/sign…");
res = await fetch(`${API}/api/payout/sign`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ roomId: roomIdLc, winner: result.winnerAddr }),
});
const proofRaw = await res.text();
log("  payout/sign:", res.status, proofRaw.slice(0, 220));
if (res.status !== 200) { log("❌ Sign-Endpoint verweigert"); process.exit(1); }
const proof = JSON.parse(proofRaw);
const pf = proof.payoutProof || proof.proof || proof;
if (!pf.signature) { log("❌ keine Signatur im Proof:", Object.keys(pf)); process.exit(1); }

// ---------- Claim on-chain als Winner ($GO) ----------
const winnerWallet = result.winnerAddr.toLowerCase() === walletA.address.toLowerCase() ? walletA : walletB;
const winnerTokenR = new ethers.Contract(GO_TOKEN, tokenAbi, provider);
const vaultW = new ethers.Contract(VAULT, vaultAbi, winnerWallet);
const goBefore = await winnerTokenR.balanceOf(winnerWallet.address);
log(`claimPayout als ${winnerWallet.address} — amount ${fmt(BigInt(pf.amount))} $GO…`);
const claimTx = await vaultW.claimPayout(pf.roomId, pf.winner, BigInt(pf.amount), BigInt(pf.nonce), BigInt(pf.deadline), pf.signature);
const rc = await claimTx.wait();
if (rc.status !== 1) { log("❌ Claim-TX reverted"); process.exit(1); }

const goAfter = await winnerTokenR.balanceOf(winnerWallet.address);
const supplyAfter = await tokenR.totalSupply();
const pot = BigInt(pf.amount);
const expectedPayout = (pot * 9500n) / 10000n; // 95% (5% Fee)
const expectedBurn = (pot * 500n * 50n) / (10000n * 100n); // 50% of 5% fee = 2.5% pot
const winnerDelta = goAfter - goBefore;
const burned = supplyBefore - supplyAfter;

log(`Winner-$GO: ${fmt(goBefore)} → ${fmt(goAfter)} (Δ +${fmt(winnerDelta)}) | erwartet Payout ${fmt(expectedPayout)}`);
log(`Burn (totalSupply): ${fmt(supplyBefore)} → ${fmt(supplyAfter)} (−${fmt(burned)}) | erwartet ${fmt(expectedBurn)}`);

const finished = rc.logs.map((l) => { try { return vaultW.interface.parseLog(l); } catch { return null; } }).find((e) => e?.name === "GameFinished");
const payoutOk = winnerDelta === expectedPayout;
const burnOk = burned === expectedBurn;
log(`✅ GameFinished-Event: ${finished ? "JA" : "NEIN"} | Payout korrekt: ${payoutOk ? "JA" : "NEIN"} | Burn korrekt: ${burnOk ? "JA" : "NEIN"}`);

log(payoutOk && burnOk && finished ? "🎉 $GO FULL-MATCH-E2E BESTANDEN (Payout + Burn verifiziert)" : "⚠️ E2E mit Auffälligkeiten — Log prüfen");
process.exit(payoutOk && burnOk && finished ? 0 : 1);
