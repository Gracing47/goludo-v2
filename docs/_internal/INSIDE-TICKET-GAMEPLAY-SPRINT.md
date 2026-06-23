# 🔒 INSIDE-TICKET — Gameplay-UX Final Sprint

> **⚠️ INTERN / DRAFT — NICHT Teil des formalen Ticket-Systems.**
> Letzter Gameplay-UX-Sprint. **Grev** (Gameplay-Implementation-Engineer) setzt um, Daniel (ich) testet/integriert. 4 Items, strikt **disjunkte Datei-Eigentümerschaft** → keine Kollisionen.

| Feld | Wert |
|------|------|
| **Datum** | 2026-06-23 |
| **Persona** | Grev (Impl) · Daniel (Test/Integration) |
| **Methode** | 4 Sonnet-Grev-Agents, disjunkte Dateien |
| **Basis** | Commit `6af6c39` (clean, revert-fähig pro Agent) |

## Globale Guardrails
- **Keine Spiellogik / kein State / kein Socket / keine Move-Math ändern.** Nur additive UI/Feedback.
- `tsc --noEmit` + `vite build` müssen grün bleiben (0 neue Errors).
- Nur GPU-Props animieren (`transform`/`opacity`), `prefers-reduced-motion` respektieren, mobile-first (380px).
- Nur die zugewiesenen Dateien editieren.

---

## GP-1 — 🎉 In-Game-Feedback-Toasts  `→ Grev-A`
Transiente, auto-dismissende Toasts bei Schlüssel-Momenten, **abgeleitet aus `gameState`** (kein App.jsx nötig — GameHUD bekommt `gameState`/`gameConfig`/`account` und rendert bereits im Game-View):
- **Capture:** Diff prev↔new `gameState.tokens` — ein gegnerischer Token, der von einer Board-Position auf `IN_YARD` (−1) wechselt → „💥 {Name} captured!".
- **Six:** `gameState.diceValue === 6` nach Roll → „🎲 Six — roll again!".
- **Home:** Token erreicht `FINISHED` (999) → „🏠 {Name} sent a token home!".
- Detection via `useRef(prevState)` + `useEffect`; Toast-Queue, 2–3s auto-dismiss, gestapelt, GPU-Animation.
- **Owns:** `src/components/HUD/GameHUD.tsx` + **neu** `src/components/HUD/GameHUD.css` (Toast-Styles dort isolieren, NICHT App.css). Bestehende Turn-Status-Bar + Mode-Badge + Disconnect **erhalten**.

## GP-2 — 📊 End-Game-Stats  `→ Grev-B`
Im Victory-Screen die **Endplatzierung** zeigen (aus bereits durchgereichten Props — App.jsx ist schon verdrahtet): `players` (Namen/Farben), `finalTokens` (`gameState.tokens`), `gameMode`.
- Pro Spieler: Farbe + Name + „X/Y home" (Tokens auf `FINISHED`=999), sortiert (Gewinner oben), Gewinner hervorgehoben.
- Props **optional** behandeln (graceful, wenn absent). Premium, on-brand (DEEP SPACE NEON Tokens).
- **Owns:** `src/components/VictoryCelebration.jsx` + `src/components/VictoryCelebration.css`. **NICHT App.jsx anfassen.**

## GP-3 — 📱 Mobile-Gameplay-Feintuning  `→ Grev-C`
Das In-Game-HUD bei **380px** sauber machen: die neue `.turn-status`-Bar (nicht mit Pods/Header überlappen, evtl. kleiner/2-zeilig), `.player-pod`/`.pod-progress`, `.side-panel`/Dice-Größe, `.pot-display`. Touch-Targets ≥44px. Nichts overflowt.
- **Owns:** `src/App.css` + `src/components/Dice.css` (nur Responsive/Layout-Tuning; bestehende Desktop-Styles + die Perf-Fixes erhalten — kein `backdrop-filter`/`blur()` wieder einführen).

## GP-4 — 🎬 Move-Telegraphing (Hover-Preview)  `→ Grev-D`  ⚠️ vorsichtig
Wenn der lokale Spieler einen bewegbaren (highlighted) Token **hovert/fokussiert**, eine **Ziel-Markierung** an der Landeposition zeigen (Ghost-Ring/Pulse), damit man sieht, wohin der Zug geht.
- Zielposition aus dem passenden `validMoves`-Eintrag (`toPosition`) → Coords wie in der Token-Map berechnet. **Positioning-Math/Logik NICHT ändern** — nur einen zusätzlichen Marker-Layer rendern + Hover-State.
- Wenn sauber nicht möglich ohne Logikrisiko: lieber **konservativ** (nur CSS-Hover-Affordance am Token) statt Board-Marker.
- **Owns:** `src/App.jsx` (chirurgisch — nur Hover-State + Marker-Render im Game-View; KEINE Logik), `src/components/Token.jsx`, `src/components/Token.css`.

---

## Integration & Test (Daniel)
Nach dem Workflow: `tsc` + `build` grün → Preview-Drive in ein Local Game → DOM/Computed-Style-Checks der neuen Elemente (Screenshots hängen im GPU-losen Headless-Renderer) → 0 Console-Errors → Board intakt (225 Cells) → Regressionen fixen/reverten → Commit + Push.
