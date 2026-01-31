# 🏁 GoLudo Final Sprint - Task Liste

> **Erstellt:** 2026-01-31  
> **Status:** Endspurt vor Launch  
> **Regel:** Kein Breaking Code, Keine Duplikation, Minimal-Invasive Fixes

---

## 📋 Task Übersicht

| # | Task | Priorität | Aufwand | Risiko | Status |
|---|------|-----------|---------|--------|--------|
| 1 | Body Size Limit hinzufügen | 🔴 Kritisch | 5 min | ⚪ Null | ✅ Done |
| 2 | Helmet.js Security Headers | 🔴 Kritisch | 10 min | ⚪ Null | ✅ Done |
| 3 | Winston Logging Setup | 🟠 Hoch | 20 min | ⚪ Null | ⏳ V2 |
| 4 | CORS Production-Only | 🟠 Hoch | 5 min | 🟡 Niedrig | ✅ Done |
| 5 | TypeScript `any` Cleanup (Server) | 🟡 Mittel | 30 min | ⚪ Null | ⏳ V2 |
| 6 | Failing Tests fixen | 🟡 Mittel | 15 min | ⚪ Null | ⏳ V2 |

---

## 🔴 KRITISCH (Vor Mainnet)

### Task 1: Body Size Limit hinzufügen
**Datei:** `backend/server.ts`  
**Zeile:** ~63  
**Änderung:**
```typescript
// VORHER:
app.use(bodyParser.json());

// NACHHER:
app.use(bodyParser.json({ limit: '10kb' }));
```
**Warum:** Verhindert DoS durch große Payloads.

---

### Task 2: Helmet.js Security Headers
**Datei:** `backend/server.ts`  
**Neue Dependency:** `helmet`  
**Änderung:**
```typescript
// Am Anfang nach imports:
import helmet from 'helmet';

// Nach app = express():
app.use(helmet({
    contentSecurityPolicy: false, // Für WebSocket-Kompatibilität
    crossOriginEmbedderPolicy: false
}));
```
**Warum:** Setzt automatisch X-Frame-Options, X-Content-Type-Options, etc.

---

## 🟠 HOCH (Vor Go-Live)

### Task 3: Winston Logging Setup
**Neue Datei:** `backend/logger.ts`  
**Änderung in:** `backend/server.ts`  
**Warum:** Strukturierte Logs für Production-Debugging.

---

### Task 4: CORS Production-Only
**Datei:** `backend/server.ts`  
**Zeile:** ~54-62  
**Änderung:**
```typescript
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
    ? ["https://goludo.netlify.app", "https://goludo-production.up.railway.app"]
    : ["http://localhost:3000", "http://localhost:5173", "https://goludo.netlify.app"];
```
**Warum:** Localhost nur in Development erlauben.

---

## 🟡 MITTEL (Nice-to-Have)

### Task 5: TypeScript `any` Cleanup
**Dateien:** `backend/server.ts`  
**Ziel:** `activeRooms: any[]` → Proper Interface  
**Risiko:** Keins, nur Type-Safety

---

### Task 6: Failing Tests fixen
**Dateien:** `backend/__tests__/*.test.js`  
**Problem:** 3 Test Suites schlagen fehl (wahrscheinlich fehlende ENV vars)  
**Fix:** Mock-Environment in jest.setup.js

---

## ⛔ NICHT ANFASSEN (Stabil)

Diese Dateien sind getestet und funktionieren - nicht ändern:
- `src/engine/gameLogic.ts` ✅
- `src/engine/aiEngine.ts` ✅
- `smart-contracts/contracts/LudoVault.sol` ✅
- `backend/signer.js` ✅
- `backend/contractVerifier.js` ✅

---

## 🚀 Implementierungs-Reihenfolge

```
1. Task 1 (Body Limit) - 5 min
   ↓
2. Task 2 (Helmet) - 10 min
   ↓
3. Task 4 (CORS) - 5 min
   ↓
4. Testen (npm run dev, Smoke-Test)
   ↓
5. Git Commit: "security: add body limit, helmet, cors hardening"
   ↓
6. Task 3 (Winston) - Optional für V1
```

---

## ✅ Acceptance Criteria

- [ ] Server startet ohne Errors
- [ ] Web3 Match Flow funktioniert (Create → Join → Play → Claim)
- [ ] Keine neuen TypeScript Errors
- [ ] Keine neuen Linter-Warnings
- [ ] Railway Deploy erfolgreich

---

**Bereit? Sag "go" und ich implementiere Task 1-4 in einem sauberen Commit.**
