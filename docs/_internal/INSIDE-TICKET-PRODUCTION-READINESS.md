# 🔒 INSIDE-TICKET — Production-Readiness Push

> **⚠️ INTERN / DRAFT — NICHT Teil des formalen Ticket-Systems.**
> Companion zu den Audit-, Scale/Economy- und UI-Tickets in `docs/_internal/`. Bündelt den „richtung production-ready"-Push: 6 Workstreams, parallel via Sonnet-Subagents mit **strikter Datei-Eigentümerschaft** (disjunkte Datei-Sätze → kein Überschreiben).

| Feld | Wert |
|------|------|
| **Datum** | 2026-06-22 |
| **Methode** | 6 Sonnet-Subagents, disjunkte Dateien + 1 geteilte Currency-Foundation (`src/config/currency.ts`) |
| **Personas** | Daniel (Eng) · Iris (Juice/Visual) · Leo (Fund-Safety/Economy) |
| **Referenz** | `PROD-*` IDs; baut auf `AAA-*` (Audit) + `LEO-*` (Economy) auf |

---

## Workstreams

### PROD-1 — 🎬 In-Game-Juice  `→ Agent C (pieces/FX) + Agent F (App.jsx shake)`
Würfel-Roll (gewichtig, Anticipation+Settle), Token-Hops (Spring/Squash-Stretch je Hop), Capture (Impact-Burst + Flash), Home/Win (celebratory Pop), Screen-Shake bei Capture/Win. GPU-only, prefers-reduced-motion, DEEP SPACE NEON Tokens. **Positioning-Math + Logic unberührt.**
- **C:** `Dice/Token/Board/ParticleEffects/VictoryCelebration` (.jsx+.css)
- **F:** `App.jsx` (Screen-Shake-Trigger via `isShaking`), `App.css` (`.shake`)
- ✅ Akzeptanz: spürbar satter, 60fps, keine Logikänderung, tsc/build grün.

### PROD-2 — 🔊 Audio-Pipeline  `→ Agent B`
Echte Web-Audio-Pipeline in `SoundManager.ts`: Master-Gain + SFX/BGM-Buses, async Buffer-Loading (`decodeAudioData`) **mit Synth-Fallback** (Assets unter `/sounds/*.mp3` existieren NOCH NICHT → darf nie werfen/blockieren), AudioBufferSource-Pooling, Round-Robin-Variation, AudioContext lazy resume on first gesture, leichte Master-Kompression, BGM-Ducking. **Public API identisch lassen** (`play/playBGM/stopBGM/toggleMute/setMuted/isMuted`).
- 📌 Follow-up: echte `.mp3`-Assets generieren (media-MCP) und in `public/sounds/` legen → Pipeline spielt sie automatisch.
- ✅ Akzeptanz: hörbar premium, kein Crash bei fehlenden Assets, Mute/Resume korrekt.

### PROD-3 — 🏎️ web3 Lazy-Load (Bundle)  `→ Agent D`
thirdweb/web3 aus dem kritischen Pfad code-splitten — Landing + Free-Play booten ohne thirdweb (~1.9MB gz heute, thirdweb-dominiert). ThirdwebProvider/ConnectButton lazy (React.lazy + Suspense / dynamic import). **Boot-safe bleiben** (kein White-Screen-Regress; `web3.ts` Graceful-Fallback erhalten).
- **D:** `main.tsx, AppRouter.tsx, web3.ts, GlobalHeader.tsx, useLudoWeb3.ts`
- ✅ Akzeptanz: App rendert weiter, thirdweb in eigenem Lazy-Chunk (nicht im Initial-Bundle), build grün.

### PROD-4 — 💱 Currency-Fix (LEO-D2)  `→ verteilt über C/D/E/F`
Alle hardcodierten „ETH"/Mock-Currency → `NATIVE_CURRENCY_SYMBOL` aus `src/config/currency.ts` (heute „C2FLR"). Betrifft: VictoryCelebration (C), web3/useLudoWeb3 (D), LandingPage/GameBrowser/Lobby (E), App.jsx (F).
- ✅ Akzeptanz: nirgends mehr „ETH"; eine Quelle.

### PROD-5 — 📱 Mobile-QA  `→ Agent E`
LandingPage 768–1023px Dice/Hero-Overlap + 380px-Overflow beheben, iOS-Safari-Parallax-Fallback (kein Verlass auf `background-attachment:fixed`; im `LandingPage.css` scopen, **global `index.css` nicht anfassen**).
- ✅ Akzeptanz: sauber bei 380px + Tablet, keine Overlaps.

### PROD-6 — 🔒 P0 Fund-Safety (AAA-C1/C2)  `→ Agent A`  ⚠️ CRITICAL
- `LudoVault.claimPayout`: `require(amount <= room.pot)` (ideal `==`); fee+payout NUR aus `room.pot` (AAA-C1).
- OpenZeppelin **Pausable** + Guardian-Rolle (separat vom Owner); `whenNotPaused` auf create/join/claim (AAA-C2).
- **Eine Source-of-Truth `feeBps`** für Contract + Server; das divergente `betAmount*5n/100n` auf `betAmount*2n` (server.ts ~448) löschen, aus echter Teilnehmerzahl/`GameFinished` ableiten.
- WAITING-Room participant-Refund nach `ROOM_TIMEOUT`; Pre-Sign-Check `potAmount == entryAmount*participants`.
- Solvenz-Invariant-Tests (fee+payout==pot für 2/3/4) + Tests **laufen lassen**.
- **A:** `LudoVault.sol, LudoVault.test.js, server.ts, signer.js, validation.js`
- ✅ Akzeptanz: Contract kompiliert, Tests grün, Server funktional.

---

## Integration (Daniel, nach dem Workflow)
`tsc --noEmit` + `vite build` grün · Contract-Tests grün · Preview-Walkthrough aller Surfaces (0 Console-Errors, Board intakt) · Bundle-Check (thirdweb lazy) · dann Commit + Push. Clean Base vor dem Push: `36a0e40` (Revert pro Agent möglich).
