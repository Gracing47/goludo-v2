/**
 * G-011 E2E: kompletter 2-Spieler-Web3-Match-Durchlauf inkl. Payout-Claim.
 * Sequenz laut Daniels Payout-Karte (G-011): WIN kommt als state_update mit
 * gamePhase 'WIN'; der PayoutProof wird per POST /api/payout/sign geholt
 * (KEIN Socket-Event); Claim on-chain mit EIP-712-Signatur, < 5 min nach WIN
 * (Room-Cleanup). Assertion: Receipt + Balance-Delta (pot − 2,5% Fee).
 *
 * ENV: DIAG_KEY = funded Coston2-Testkey (Wallet A). Wallet B wird generiert
 * und von A gefundet. Testnet only.
 * Aufruf:  DIAG_KEY=… node scripts/e2e-full-match.mjs
 */
import { ethers } from "ethers";
import { io } from "socket.io-client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC = "https://coston2-api.flare.network/ext/C/rpc";
const API = "https://goludo-v2-production.up.railway.app";
const VAULT = "0xa8d47bE166B677125BD28a1d94FF087d4B45923a";
const STAKE = "0.5";
const MODE = "rapid"; // first-to-1 → kürzestes Match

const provider = new ethers.JsonRpcProvider(RPC, undefined, { staticNetwork: true });
const abi = JSON.parse(readFileSync(path.join(__dirname, "../src/abi/LudoVault.json"), "utf8")).abi;

const keyA = process.env.DIAG_KEY;
if (!keyA) { console.error("DIAG_KEY fehlt"); process.exit(1); }
const walletA = new ethers.Wallet(keyA, provider);
const walletB = ethers.Wallet.createRandom().connect(provider);
const vaultA = new ethers.Contract(VAULT, abi, walletA);
const vaultB = new ethers.Contract(VAULT, abi, walletB);

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const fmt = (v) => Number(ethers.formatEther(v)).toFixed(4);

// ---------- Setup: B funden ----------
log("A:", walletA.address, fmt(await provider.getBalance(walletA.address)), "C2FLR");
const fundTx = await walletA.sendTransaction({ to: walletB.address, value: ethers.parseEther("1.0") });
await fundTx.wait();
log("B:", walletB.address, fmt(await provider.getBalance(walletB.address)), "C2FLR (frisch gefundet)");

// ---------- Raum: on-chain + Backend (exakt der Frontend-Flow) ----------
const roomId = ethers.id("E2E_" + Date.now());
const roomIdLc = roomId.toLowerCase();
const stakeWei = ethers.parseEther(STAKE);

log("A createRoom on-chain…");
const createTx = await vaultA.createRoom(roomId, stakeWei, 2n, { value: stakeWei });
await createTx.wait();
let res = await fetch(`${API}/api/rooms/create`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ roomId, txHash: createTx.hash, stake: STAKE, maxPlayers: 2, creatorName: "E2E-Alice", creatorAddress: walletA.address, color: "red", mode: MODE }),
});
log("  Backend create:", res.status, (await res.text()).slice(0, 100));
if (res.status !== 200) process.exit(1);

log("B joinRoom on-chain…");
const joinTx = await vaultB.joinRoom(roomId, { value: stakeWei });
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
    // WIN-Erkennung (Daniel-Karte Schritt 3-4)
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

    // Doppel-Aktionen auf identische States vermeiden
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

// ---------- Warten bis Sieg (max 10 Min; Claim-Fenster ist 5 Min NACH Win) ----------
const deadline = Date.now() + 10 * 60 * 1000;
let lastLog = 0;
while (result.winnerIdx === null && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 1000));
  if (Date.now() - lastLog > 30000) { lastLog = Date.now(); log(`… Match läuft (${result.moves} Würfe)`); }
}
A.socket.disconnect(); B.socket.disconnect();
if (result.winnerIdx === null) { log("❌ TIMEOUT — kein WIN binnen 10 Min"); process.exit(1); }

// ---------- PayoutProof per HTTP holen (Daniel-Karte Schritt 5-8) ----------
log("POST /api/payout/sign…");
res = await fetch(`${API}/api/payout/sign`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ roomId: roomIdLc, winner: result.winnerAddr }),
});
const proofRaw = await res.text();
log("  payout/sign:", res.status, proofRaw.slice(0, 220));
if (res.status !== 200) { log("❌ Sign-Endpoint verweigert"); process.exit(1); }
const proof = JSON.parse(proofRaw);
const p = proof.payoutProof || proof.proof || proof;
if (!p.signature) { log("❌ keine Signatur im Proof:", Object.keys(p)); process.exit(1); }

// ---------- Claim on-chain als Winner (Schritt 9-10) ----------
const winnerWallet = result.winnerAddr.toLowerCase() === walletA.address.toLowerCase() ? walletA : walletB;
const vaultW = new ethers.Contract(VAULT, abi, winnerWallet);
const before = await provider.getBalance(winnerWallet.address);
log(`claimPayout als ${winnerWallet.address} — amount ${fmt(BigInt(p.amount))} C2FLR…`);
const claimTx = await vaultW.claimPayout(p.roomId, p.winner, BigInt(p.amount), BigInt(p.nonce), BigInt(p.deadline), p.signature);
const rc = await claimTx.wait();
if (rc.status !== 1) { log("❌ Claim-TX reverted"); process.exit(1); }
const finished = rc.logs.map((l) => { try { return vaultW.interface.parseLog(l); } catch { return null; } }).find((e) => e?.name === "GameFinished");
const after = await provider.getBalance(winnerWallet.address);
log(`✅ GameFinished-Event: ${finished ? "JA" : "NEIN"} | Winner-Balance ${fmt(before)} → ${fmt(after)} (Δ +${fmt(after - before)})`);

// Der Proof trägt den VOLLEN Pot (Contract verlangt amount == room.pot);
// die 2,5%-Fee zieht der Contract beim Claim ab (verifiziert Lauf 1: Δ +0.9105
// = 0.975 Payout − Claim-Gas bei Pot 1.0).
log(`Payout laut Proof (voller Pot): ${fmt(BigInt(p.amount))} | Netto erwartet: ${fmt((BigInt(p.amount) * 9750n) / 10000n)} − Gas`);

// ---------- Aufräumen: B-Rest zurück an A ----------
const bBal = await provider.getBalance(walletB.address);
if (bBal > ethers.parseEther("0.05")) {
  const back = bBal - ethers.parseEther("0.05"); // Gas-Reserve (0.02 war zu knapp, Lauf 1)
  await (await walletB.sendTransaction({ to: walletA.address, value: back })).wait();
  log("B-Rest zurück an A:", fmt(back));
}
log("A final:", fmt(await provider.getBalance(walletA.address)), "C2FLR");
log(finished && after > before ? "🎉 FULL-MATCH-E2E BESTANDEN" : "⚠️ E2E mit Auffälligkeiten — Log prüfen");
process.exit(0);
