# 🔒 INSIDE-TICKET — G-003 · Deployment & Launch-Infra

> **⚠️ INTERN / DRAFT — NICHT Teil des formalen Ticket-Systems.**
> Live-Schaltung von GoLudo: Frontend → Vercel, Backend + DBs → Railway. Vault-Tracking: `09 Tickets/G-003`.

| Feld | Wert |
|------|------|
| **Datum** | 2026-06-23 |
| **Persona** | Daniel (Eng/DevOps) |
| **Repo** | `goludo-v2` · Branch `master` |

## Architektur (verbindlich)

| Teil | Tech | Host | Status |
|------|------|------|--------|
| **Frontend** | Vite-SPA (statisch, React 18 + TS) | **Vercel** | ⏳ wartet auf gültigen Access-Token |
| **Backend** | Socket.IO + Express, `tsx server.ts`, **stateful** (in-memory Rooms/Timer), Healthcheck `/health` | **Railway** | ✅ Online |
| **DB** | Postgres (Prisma, `ProfileManager`) | Railway | ✅ Online (connected) |
| **Cache/State** | Redis (`GameStateManager`, Room-Recovery/Scale) | Railway | ✅ Online (recovered 36 Rooms) |
| **Chain** | Solidity `LudoVault` (Stakes), EIP-712 Server-Signer | Flare Coston2 | ✅ deployed |

**Kernregel:** Das Backend ist ein **persistenter WebSocket-Server** und gehört NICHT auf Vercel-Serverless (kein langlebiger Prozess, kein geteilter State). Frontend (statisch) → Vercel, Realtime-Backend → Railway. Siehe Stack-Bible „Realtime-Multiplayer-Stack (GoLudo)".

## Stand 2026-06-23

- **Railway** (Projekt `bc2bb107-…`, Service `goludo-v2`):
  - Trial war abgelaufen → alle Services gestoppt (Domain lieferte 404 „Application not found"). Plan von Thomas hinzugefügt.
  - Backend via `railway up --service goludo-v2 --ci` neu deployt → **● Online**, `/health` 200.
  - **Alle Backend-Env-Vars bereits gesetzt** (inkl. `SERVER_SIGNER_PRIVATE_KEY`, `DATABASE_URL`, `REDIS_URL`, `FLARE_RPC_URL`, `CHAIN_ID`, Contract-Adressen) — der Geld-Key musste nicht angefasst werden.
  - **CORS-Fix live:** `backend/server.ts` erlaubt jetzt `https://<sub>.vercel.app` (Commit `2eb3219`, lokal) → bestätigt via `access-control-allow-origin`-Header.
  - **Postgres + Redis hochgefahren** (`railway redeploy --service <db> --from-source`) → beide ● Online, `/health` meldet `database.connected:true` + `redis.connected:true`, Redis recovered 36 Rooms aus dem Volume. **Backend-Stack voll operativ.**
- **Vercel** (Team `blexxed47's projects`):
  - `vercel.json` erstellt (SPA-Rewrite + Security-/Cache-Header, framework vite, output `dist`).
  - **Blocker:** Der im Tresor hinterlegte `vck_…`-Token ist ein **AI-Gateway-API-Key**, KEIN Deploy-Token → von der CLI als „not valid" abgelehnt. Es braucht einen **Account Access Token** von `vercel.com/account/settings/tokens`.

## Runbook — restliche Schritte

### Postgres + Redis starten (stateful → bewusste Aktion)
```bash
RAILWAY_TOKEN=<projekt-token> railway redeploy --service Postgres --from-source --yes
RAILWAY_TOKEN=<projekt-token> railway redeploy --service Redis    --from-source --yes
# danach verifizieren:
curl -s https://goludo-v2-production.up.railway.app/health   # redis.connected + database.connected → true
```
Alternativ im Railway-Dashboard je Service „Deploy" klicken.

### Frontend auf Vercel
1. Access-Token erzeugen (`vercel.com/account/settings/tokens`), in Tresor ablegen.
2. `cd goludo-v2 && vercel link --yes --token=<access-token>` (Team `blexxed47's projects`).
3. Die 4 **öffentlichen** Env-Vars setzen (Production + Preview), VOR dem Build (VITE_ = build-time):
   - `VITE_THIRDWEB_CLIENT_ID=725441ee35f59802c609f547d5fc8f91`
   - `VITE_GOTOKEN_ADDRESS=0x937667232207904006E88888EB33aCA8E1700688`
   - `VITE_LUDOVAULT_ADDRESS=0xd3EB7151534BBDFcb70352DA8E727B6000966E14`
   - `VITE_API_URL=https://goludo-v2-production.up.railway.app`
4. `vercel deploy --prod --token=<access-token>` → Build + Live.
5. `/health`-CORS gegen die finale Vercel-Domain gegenprüfen (Regex deckt `*.vercel.app` ab; Custom-Domain ggf. ergänzen).

## Sicherheits-Notizen
- `SERVER_SIGNER_PRIVATE_KEY` (signiert Payouts = Geld) lebt **nur** als Railway-Backend-Env, nie auf Vercel/Client.
- `VITE_DEEPSEEK_API_KEY` hat `VITE_`-Prefix → landet öffentlich im Bundle. Besser: AI-Kommentator über Vercel AI Gateway hinter Backend-Proxy (der erzeugte `vck_`-Gateway-Key passt dafür, ohne `VITE_`).
- Tokens nie ins Repo; nur Tresor (`Tresor/Zugänge.md`, gitignored).
