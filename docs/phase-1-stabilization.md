# GoLudo — Phase 1: Stabilisierung

> **Version:** 1.0  
> **Status:** In Progress  
> **Scope:** Critical security fixes + code quality improvements  
> **Principle:** Fix what's broken, don't add new features

---

## Übersicht

Phase 1 macht den bestehenden Code **produktionsreif** ohne neue Features hinzuzufügen. Aufgeteilt in 3 Sprints:

| Sprint | Fokus | Status |
|--------|-------|--------|
| **Sprint 1** | Critical Fixes (RNG, Verification, Validation) | 🔨 In Arbeit |
| **Sprint 2** | Infrastructure (Redis, DB, Profile System) | ⏳ Geplant |
| **Sprint 3** | Code Quality & Tests | ⏳ Geplant |

---

## Sprint 1: Critical Fixes

### ✅ Checklist

#### Task 1.1: RNG Fix (crypto.randomBytes)
- [x] `crypto.randomInt()` in `server.ts` importieren
- [x] Server-side Dice Roll mit `randomInt(1, 7)` ersetzen
- [x] Kommentar in `gameLogic.ts` hinzufügen (Local/AI Games = Math.random OK)
- [x] Verifizieren: Node.js `randomInt` funktioniert
- [x] Verifizieren: Frontend Build bricht nicht

#### Task 1.2: Verification Enforcement
- [x] Production-Guard in `contractVerifier.js` Startup-Logik
- [x] Production-Guard in `verifyRoomCreation()` Funktion
- [x] Production-Guard in `verifyRoomJoin()` Funktion
- [x] Bug fix: `roomState.opponent` → `getParticipants()` verwenden
- [x] `.env.example` mit `NODE_ENV` und `FLARE_RPC_URL` updaten
- [ ] Verifizieren: Server crasht in Production ohne RPC URL

#### Task 1.2b: Join Endpoint Validation
- [x] `joinRoomSchema` Zod Schema erstellen in `validation.js`
- [x] `validateRequest()` Middleware auf `/api/rooms/join` anwenden
- [ ] Verifizieren: Ungültige Requests werden mit 400 abgelehnt

#### Regression Tests
- [x] Alle bestehenden Backend-Tests bestehen (signer ✅, andere pre-existing Jest/TS failures)
- [ ] Alle bestehenden Smart-Contract-Tests bestehen
- [x] Frontend Build erfolgreich

---

## Sprint 2: Infrastructure (Geplant)

### Task 1.3: Profile System (Database Setup)
- [ ] Datenbank auswählen (PostgreSQL empfohlen)
- [ ] Prisma Schema erstellen
- [ ] ProfileManager Service implementieren
- [ ] API Routes hinzufügen (`/profile/:address`, `/leaderboard/:metric`)
- [ ] In Game Flow integrieren (Stats nach Spielende updaten)
- [ ] Profile Tests schreiben

### Task 1.4: Game State Persistence (Redis)
- [ ] Redis Client Setup (`ioredis`)
- [ ] GameStateManager Service implementieren
- [ ] In-Memory `activeRooms[]` durch Redis ersetzen
- [ ] Checkpoint System (alle 10 Züge)
- [ ] Recovery Logik bei Server-Restart
- [ ] Redis Health Check Endpoint
- [ ] Railway Redis Plugin konfigurieren

---

## Sprint 3: Code Quality & Tests (Geplant)

### Task 2.1: server.ts Refactoring
- [ ] Routes in separate Dateien extrahieren
- [ ] Socket Handler modularisieren
- [ ] Service Layer erstellen
- [ ] server.ts auf ~200 Zeilen reduzieren

### Task 2.2: Complete Test Suite
- [ ] Smart Contract Tests erweitern (Cancellation, Invalid Sig, Reentrancy, etc.)
- [ ] 90%+ Contract Coverage erreichen
- [ ] Backend Integration Tests (Full Game Flow)
- [ ] Frontend Component Tests

### Task 2.3: Security Polish
- [ ] `Pausable` Pattern zu LudoVault hinzufügen
- [ ] Pull-over-Push Refund Pattern
- [ ] Production Log Levels (pino/winston)
- [ ] `/api/rooms` Response bereinigen (keine Socket IDs)
- [ ] `@ts-ignore` in Frontend entfernen

---

## RNG Strategie

```
Phase 1 (Jetzt):  crypto.randomInt() für Testnet — Server-side, kryptographisch sicher  
Phase 2 (Mainnet): Commit-Reveal Schema — Provably fair, keine Oracle-Kosten
```

| Lösung | Empfehlung |
|--------|-----------|
| `crypto.randomInt()` | 🟢 Jetzt implementieren (Testnet) |
| Commit-Reveal Schema | 🟢 Beste Lösung für Mainnet |
| Flare FTSO | ❌ Nicht für RNG designed |
| Chainlink VRF | ❌ Nicht auf Flare verfügbar |

---

## Game State Architektur

```
┌──────────────────────────────────────────┐
│  Hybrid State Management (Phase 1.4)     │
└──────────────────────────────────────────┘

1. Room Creation → ON-CHAIN (LudoVault)
2. Gameplay     → OFF-CHAIN (Redis + Server)
3. Checkpoints  → Redis + DB (alle 10 Züge)
4. Payout       → ON-CHAIN (EIP-712 signed)
5. Recovery     → DB Move Log → Replay → Verify
```

---

## Abnahmekriterien

Sprint 1 ist **fertig** wenn:
1. ✅ Server-side Dice verwendet `crypto.randomInt()`
2. ✅ Production-Mode blockt Server-Start ohne `FLARE_RPC_URL`
3. ✅ `/api/rooms/join` hat Zod-Validation
4. ✅ `roomState.opponent` Bug ist behoben
5. ✅ Alle bestehenden Tests bestehen
6. ✅ Frontend Build erfolgreich
