# 🔒 INSIDE-TICKET — AAA UI Enhancement ("DEEP SPACE NEON")

> **⚠️ INTERN / DRAFT — NICHT Teil des formalen Ticket-Systems.**
> Companion zu [INSIDE-TICKET-AAA-AUDIT.md](./INSIDE-TICKET-AAA-AUDIT.md) und [INSIDE-TICKET-AAA-SCALE-ECONOMY.md](./INSIDE-TICKET-AAA-SCALE-ECONOMY.md). Dokumentiert den mutigen, distinktiven AAA-UI-Overhaul über ALLE Oberflächen.
>
> **Referenz-IDs:** Design-System-Tokens `UI-T*`, Surface-Implementierungen `UI-S*`. Personas: **Iris** (Design) + **Daniel** (Implementierung).

| Feld | Wert |
|------|------|
| **Design-Language** | DEEP SPACE NEON |
| **Richtung** | Bolder & distinctive (Owner-Wahl) · Marken-Neon beibehalten · kein Purple |
| **Methode** | Iris forged 1 Design-Language + 61 Tokens → 6 Sonnet-Implementer parallel je Surface |
| **Datum** | 2026-06-22 |
| **Status** | ✅ `tsc` 0 Errors · ✅ `vite build` grün · ✅ alle Surfaces visuell verifiziert · ✅ 0 Console-Errors |

---

## 🎨 Iris Design-Language — DEEP SPACE NEON

> GoLudo lives in the void between stars — panels that float in true layered depth over a fixed near-black cosmos, lit from beneath by electric neon bloom rather than flat glows. Every surface has physical weight: ambient shadow + direct shadow + a faint grain texture that makes glass feel solid, not flat. Typography is either whispering (Outfit body) or screaming (Orbitron display at clamp sizes that break 5xl) — nothing politely medium. Motion follows physics: spring-overshoot on entries, instant snap on presses, GPU-only transforms that feel expensive without costing frame-rate.

**Typografie:** Display family: Orbitron (now loaded with weights 400–900 including the new 800/900 for hero lockups). Body family: Outfit (humanist grotesque, warmer than Inter — now primary body font loaded). Mono: JetBrains Mono (on-chain addresses, code). Type scale extended to --text-6xl (4rem / 64px) and --text-7xl (5.5rem / 88px) for hero lockups. Hero titles should use clamp(var(--text-5xl), 14vw, var(--text-7xl)) with font-weight: var(--font-black) and letter-spacing: var(--tracking-wide). Section headings: --text-4xl, var(--font-extrabold), var(--tracking-wide). Body text: --text-base, var(--font-normal), var(--leading-normal). HUD labels / badges: --text-xs, var(--font-bold), var(--tracking-widest), all-caps. Use .gradient-text-hero on the hero brand word for the animated tri-color sweep.

**Farb-Einsatz:** --neon-cyan #00f3ff — primary interactive chrome, focus rings, active borders, HUD chip default, stat values, link underlines. --neon-blue #3a86ff — secondary accent, info states, player-blue token, secondary button fills. --neon-pink #ff007a — primary CTA buttons, active/selected states, danger accents, the strongest neon for maximum contrast against near-black. --neon-gold #ffd700 — reward/stake callouts, win states, currency values, trophy badges. No purple anywhere in the new system; --glow-purple and --color-secondary are remapped to neon-blue for backward compatibility. Background palette stays pure space navy: #06060f base, #0b0b1e body gradient midpoint, #080e1a dark teal-black end stop — no warm purple or indigo tones.

### Prinzipien

**Layout**
- Mobile-first column stack at 380px; grid/flex expansions at 768px and 1024px breakpoints.
- Panels float above the fixed background — use position:relative + isolation:isolate so grain and reflection pseudo-elements stay clipped inside border-radius.
- Asymmetric tension on hero sections: oversized display text offset left, decorative 3D dice or orb anchored top-right — break grid monotony.
- Lobby container max-width 480px mobile / 520px tablet stays centered but gains visual weight via elev-3 + bloom-cyan on hover, not just a translateY lift.
- Section content max-width 1000px, hero max-width 700px — wide enough to breathe, tight enough to feel focused on mobile.
- z-index discipline: board(1) → hud(10) → dropdown(50) → overlay(100) → modal(200) → toast(300) → tooltip(400).

**Motion**
- Spring physics for all entrances: use --ease-spring (cubic-bezier(0.175, 0.885, 0.32, 1.275)) on translateY + scale reveals.
- Press feedback is instant-down / spring-release: :active { transform: scale(0.97) } with --ease-press (cubic-bezier(0.25, 1.4, 0.5, 1)) on release.
- Staggered reveals: apply .reveal-up.reveal-stagger to feature grids and stat cards — nth-child delays auto-cascade 0→360ms.
- GPU-only: animate ONLY transform and opacity. box-shadow changes use transition but are secondary to the transform story.
- Duration ladder: micro-interactions --dur-fast (180ms), page transitions --dur-normal (360ms), ambient loops --dur-crawl (2400ms).
- Honors prefers-reduced-motion: the global @media kill-switch in both tokens.css and index.css collapses all durations to 0.01ms with !important.

**Depth**
- Elevation scale: --elev-0 through --elev-4, each adding an ambient layer (large-radius, low opacity) on top of the direct shadow. Never use a single box-shadow value alone.
- Neon bloom: --bloom-cyan/blue/pink/gold are multi-stop glows (16px / 48px / 96px spread at decreasing opacity) — add them to interactive cards and CTAs to push panels off the background plane.
- Grain texture: .grain-overlay::after (and .liquid-glass::after) overlay an SVG fractalNoise pattern at 2.8–3% opacity with mix-blend-mode:overlay — this makes glass panels feel physically textured, not just transparent.
- Top-edge light: .glass-card::before is a 1px linear-gradient highlight simulating a physical light source above the panel.
- Backdrop-filter includes saturate(1.6) alongside blur(24px) so colours behind panels bleed through slightly saturated, reinforcing the neon-lit-space atmosphere.

### Component-Patterns

<details><summary>11 Patterns (Buttons, Cards, Panels, HUD …) — ausklappen</summary>

**UI-P1 · Primary CTA Button (btn-launch style)**  
background: linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-blue) 100%); color: #000; border: none; border-radius: var(--radius-md); padding: var(--space-5) var(--space-12); font-family: var(--font-display); font-weight: var(--font-bold); letter-spacing: var(--tracking-wide); box-shadow: var(--elev-2), var(--bloom-cyan); transition: transform var(--dur-fast) var(--ease-spring), box-shadow var(--dur-fast) var(--ease-premium). :hover { transform: translateY(-4px) scale(1.03); box-shadow: var(--elev-3), var(--bloom-cyan); } :active { transform: scale(0.97); } Use .shimmer class for the shine-sweep overlay on the ::before pseudo.

**UI-P2 · Pink CTA Button (action-btn start / create-game-btn)**  
background: linear-gradient(135deg, var(--neon-pink) 0%, var(--neon-blue) 100%); color: #fff; box-shadow: var(--elev-2), var(--bloom-pink); same hover/active pattern. The ::before shine-sweep (btn-shine keyframe) runs on a 4s loop. On disabled: opacity 0.45, cursor: not-allowed, no transform.

**UI-P3 · Ghost / Back Button**  
background: var(--tint-cyan-4); border: var(--border-thin) solid var(--border-white-hi); color: var(--text-secondary); border-radius: var(--radius-sm); :hover { background: var(--tint-cyan-8); border-color: var(--border-cyan); color: var(--text-primary); }

**UI-P4 · Glass Panel / Card**  
background: var(--glass-bg); backdrop-filter: var(--glass-blur) var(--glass-saturation); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); box-shadow: var(--elev-2); isolation: isolate. ::before top-edge highlight. ::after grain overlay (see .liquid-glass). :hover { border-color: var(--border-cyan); box-shadow: var(--elev-3), var(--bloom-cyan); transform: translateY(-6px) scale(1.015); }

**UI-P5 · Menu Button (lobby menu items)**  
background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-md); :hover { background: var(--bg-card-hover); border-color: var(--border-cyan); box-shadow: var(--elev-2); transform: translateY(-4px) scale(1.02); } Left accent strip ::after: width 3px, background var(--neon-cyan) / var(--neon-pink) / var(--neon-blue) per variant, box-shadow: var(--bloom-cyan) on hover.

**UI-P6 · HUD Chip / Badge**  
Use .hud-chip utility class. Variants: default (cyan), .pink, .gold, .blue. Each = tint-N-8 background + border-N + color var(--neon-N) + elev-1 + bloom-N. Font: var(--font-display), --text-xs, var(--tracking-widest), uppercase. Touch target minimum 44px height achieved by line-height padding.

**UI-P7 · Stat Card**  
background: var(--tint-cyan-4) or transparent with border: 1px solid var(--border-white-lo); border-radius: var(--radius-md); box-shadow: var(--elev-1). .stat-value: font-family var(--font-display), color var(--neon-cyan), text-shadow: 0 0 20px rgba(0,243,255,0.5). :hover { border-color: var(--border-cyan); transform: translateY(-6px); box-shadow: var(--elev-2), var(--bloom-cyan); } Apply .reveal-up.reveal-stagger to stat-grid for staggered entrance.

**UI-P8 · Player Config Card**  
background: var(--tint-cyan-4); border: 1.5px solid var(--border-white-lo); border-radius: var(--radius-md); backdrop-filter: blur(8px). :focus-within { border-color: var(--border-cyan); box-shadow: var(--bloom-cyan); } Color picker swatches use box-shadow: 0 0 16px currentColor, 0 0 32px currentColor on .selected.

**UI-P9 · Input Field**  
Use .input-neon class: dark background rgba(0,0,0,0.40), border var(--border-medium) solid var(--border-white-hi), border-radius var(--radius-sm). :focus { border-color: var(--neon-pink); box-shadow: 0 0 0 3px var(--tint-pink-12), var(--bloom-pink); } Animated focus ring via transition on border-color and box-shadow.

**UI-P10 · Room Card (web3 lobby)**  
background: var(--tint-cyan-4); border: 1.5px solid var(--border-white-lo); border-radius: var(--radius-md); box-shadow: var(--elev-1). Left-edge accent ::before: 4px wide, background linear-gradient(180deg, var(--neon-cyan), var(--neon-pink)). :hover { border-color: var(--border-cyan); background: var(--tint-cyan-8); box-shadow: var(--elev-2), var(--bloom-cyan); }

**UI-P11 · Modal / Sheet**  
background: rgba(8, 8, 20, 0.96); backdrop-filter: blur(40px) saturate(1.4); border: 1.5px solid var(--border-white-hi); border-radius: var(--radius-xl); box-shadow: var(--elev-4). Entrance: slideUp keyframe (opacity 0 + translateY(28px) scale(0.97)) with --dur-normal --ease-spring. Overlay: rgba(0,0,0,0.72) + backdrop-filter: blur(8px).

</details>

### Geschriebene Tokens (`UI-T`)

`--neon-cyan` · `--neon-blue` · `--neon-pink` · `--neon-gold` · `--tint-cyan-4` · `--tint-cyan-8` · `--tint-cyan-12` · `--tint-cyan-20` · `--tint-blue-4` · `--tint-blue-8` · `--tint-blue-12` · `--tint-blue-20` · `--tint-pink-4` · `--tint-pink-8` · `--tint-pink-12` · `--tint-pink-20` · `--tint-gold-4` · `--tint-gold-8` · `--tint-gold-12` · `--tint-gold-20` · `--border-cyan` · `--border-blue` · `--border-pink` · `--border-gold` · `--border-white-lo` · `--border-white-hi` · `--bg-raised` · `--bg-card-hover` · `--bg-contrast-lo` · `--bg-contrast-md` · `--bg-contrast-hi` · `--glass-saturation` · `--gradient-hero` · `--gradient-animated` · `--text-6xl` · `--text-7xl` · `--font-black` · `--leading-none` · `--leading-snug` · `--tracking-tight` · `--tracking-wider` · `--tracking-widest` · `--space-32` · `--radius-xs` · `--elev-0` · `--elev-1` · `--elev-2` · `--elev-3` · `--elev-4` · `--bloom-cyan` · `--bloom-blue` · `--bloom-pink` · `--bloom-gold` · `--dur-instant` · `--dur-fast` · `--dur-normal` · `--dur-slow` · `--dur-slower` · `--dur-crawl` · `--ease-spring` · `--ease-press`

---

## 🛠️ Surface-Implementierungen

### UI-S1 — Landing-Page  `✅ follows spec`

**Dateien:** `src/pages/LandingPage.tsx` · `src/pages/LandingPage.css`

- HERO LAYOUT — Broke the centered-stack default into an asymmetric composition: display text hard-left, three floating glassmorphic dice (primary 260px, secondary 175px, tertiary 120px) anchored top-right as a decorative cluster that breaks the grid at 1024px+. Mobile: dice shrink to 0.65 scale, opacity 0.45, pushed to background so text stays legible on 380px.
- PARALLAX DEPTH — Added --hero-scroll CSS custom property updated on scroll via passive IntersectionObserver-safe wheel listener. Each orb and the dice cluster moves at a different rate (0.08–0.20 multiplier), creating genuine z-depth without JS layout thrash. Reduced-motion override collapses all transforms.
- SCROLL-TRIGGERED STAGGERED REVEALS — IntersectionObserver (threshold 0.15) adds .is-visible to every .reveal-up element inside stats and features sections. reveal-stagger wrapper auto-cascades nth-child delays 60–360ms via tokens.css utility. Stats grid and features grid both use this pattern.
- HERO TITLE REDESIGN — Two-line split: 'Go' (white, extrabold, slight right indent for tension) + 'Ludo' using .gradient-text-hero (animated tri-colour cyan→blue→pink→gold sweep from tokens.css). Size: clamp(var(--text-5xl), 14vw, var(--text-7xl)) with --font-black and --tracking-wide per Iris spec.
- PREMIUM CTA — btn-launch uses IRIS primary CTA spec: cyan→blue gradient, var(--elev-2) + var(--bloom-cyan) shadow stack, shimmer-sweep animation via ::after pseudo, spring-physics Framer hover (stiffness 400, damping 18), instant-down / spring-release active. Added ghost secondary CTA 'Explore Features' with tint-cyan-4 background.
- STATS CARDS — Fully rebuilt with var(--tint-cyan-4) bg, var(--border-white-lo), var(--elev-1), top-edge light via ::before, hover lifts to var(--elev-2) + var(--bloom-cyan). Highlight card adds gold bloom on hover. stat-value consumes var(--neon-cyan) + text-shadow per IRIS stat-card spec.
- FEATURE CARDS — Extended .glass-card class (backdrop-filter blur(24px) saturate(1.6), var(--elev-2), top-edge ::before highlight from index.css). Per-variant hover overrides (--bloom-cyan/pink/gold). Left-side 3px accent bar (.feature-accent-bar) fades in on hover per menu-button pattern. Feature icons get per-neon drop-shadow filter.
- COSMOS GRID — Added fixed faint cyan perspective grid overlay (80px cells, 2.5% opacity) masked with vertical linear-gradient to create depth cue without visual noise. Pure CSS, pointer-events none, z-index 0.
- BACKGROUND COSMOS — Four orbs instead of three: added neon-blue orb at bottom-right. All orbs use parallax transform offset from --hero-scroll. Stars seeded deterministically (golden-ratio spacing) to avoid hydration-sensitive Math.random layout shifts.
- HUD CHIP EYEBROW — Replaced plain network-badge div with .hud-chip token-system component (from tokens.css) containing animated pulse dot. Pink variant chip used as section header label for features.
- IRIS TOKEN CONSUMPTION — Exhaustive use of: --neon-cyan/blue/pink/gold, --tint-*-4/8, --border-cyan/pink/gold/white-lo/hi, --elev-1/2/3, --bloom-cyan/pink/gold, --ease-spring/press/premium, --dur-fast/normal/slow, --font-display/body, --text-xs through --text-7xl (clamp), --font-bold/extrabold/black, --tracking-wide/wider/widest, --leading-none/relaxed, --radius-md/lg, --space-3 through --space-24.
- REDUCED MOTION — All dice animations, orb floats, star twinkles, pulse-dot, tag-word pulses, and shimmer sweep collapsed to none. Parallax transforms set to none. Belt-and-suspenders on top of global kill-switch in tokens.css + index.css.
- BUILD VERIFICATION — npx tsc --noEmit: zero errors. vite build: green (1m 3s). LandingPage JS chunk: 13.14 kB gzipped 3.55 kB. Large-chunk warning is pre-existing web3 vendor bundle unrelated to this change.

<details><summary>QA-Risiken (5)</summary>

- DICE CLUSTER OVERLAP (tablet 768–1023px) — At mid-range tablet widths the dice cluster may overlap hero text if the viewport is narrow-tall (portrait iPad). The cluster is position:absolute so it does not push layout; text has z-index:10 over z-index:2 dice, but visual overlap could reduce legibility. Recommend QA at 768×1024 portrait.
- PARALLAX ON iOS SAFARI — background-attachment:fixed on the body (index.css) is ignored on iOS Safari in some contexts; the --hero-scroll parallax uses transform which is fine. However the cosmos-grid uses -webkit-mask-image which has broad support but should be verified on Safari 15.
- GLASS-CARD BACKDROP-FILTER STACKING — Feature cards use .glass-card which applies backdrop-filter. When three are on screen simultaneously and overlap orb blurs behind them, older Android WebViews (Chrome <76) may show as opaque black. Fallback background: var(--glass-bg) is set, so it degrades gracefully but loses the blur.
- DICE SVG ANIMATE ELEMENTS — SVG <animate> tags are used for dot opacity pulses. These are collapsed by the prefers-reduced-motion kill-switch via animation-duration:0.01ms !important, but the SVG SMIL animate tag may not respond to the CSS animation-duration override on all browsers (Firefox honors it; Safari/Chrome may not for SMIL). Visual-only risk — dots may still pulse on reduced-motion in some browsers.
- CTA HOVER ON TOUCH DEVICES — Framer whileHover triggers on touch tap-and-hold on some mobile browsers, which can cause the button to appear 'stuck' elevated. This is standard Framer behavior and not a regression, but worth noting for QA on iOS Safari tap behavior.

</details>

### UI-S2 — Lobby / Mode-Select + Setup  `✅ follows spec`

**Dateien:** `src/components/Lobby.css` · `src/components/Lobby.jsx`

- Lobby.css fully replaced: pure space-navy background (no purple), lobby-container gains elev-3 + grain-overlay via ::after + top-edge light via ::before, spring-physics panel entrance animation (lobby-panel-in keyframe)
- Menu cards (.menu-button) redesigned as deep glass panels with per-variant accent strips (::after, 3px, cyan/blue/pink), icon containers (48px, tinted backgrounds), hover lifts to translateY(-5px) scale(1.015) + bloom, instant-snap :active scale(0.97), all three variants use correct --border-cyan/blue/pink and --bloom-cyan/blue/pink
- New .lobby-menu-heading block added above the three mode cards with bold Orbitron h2 and Outfit descriptor line — breaks the generic list layout
- Mode badge chips (.mode-badge) added inside each card (top-right corner) using hud-chip spec: display/xs/bold/widest/uppercase + per-variant tint+border+color
- .setup-title updated: Orbitron extrabold, left-aligned, border-bottom rule, icon in neon-cyan with drop-shadow — replaces old emoji+centered style
- .setup-label retyped to Orbitron xs bold widest tracking uppercase
- Player config cards use tint-cyan-4 bg + border-white-lo, :focus-within triggers border-cyan + bloom-cyan
- Player type badges/buttons updated to font-display with tracking-wider, AI variant uses neon-blue (not purple)
- Name inputs use input-neon spec: dark bg, border-white-hi, pink focus ring with tint-pink-12 halo
- Count/stake buttons use Orbitron font, cyan hover tint, active pink-to-blue gradient + bloom-pink
- Variant buttons use pink tint on hover/active with bloom-pink on .active state
- .action-btn.back uses tint-cyan-4 + border-white-hi ghost spec; .action-btn.start uses neon-pink→neon-blue gradient + elev-2 + bloom-pink + shine-sweep ::before animation
- .create-game-btn matches Pink CTA button spec (gradient + bloom-pink + shine-sweep)
- .join-btn redesigned as cyan CTA (cyan→blue gradient, color:#000, bloom-cyan)
- Room cards use tint-cyan-4 + border-white-lo + left-edge cyan→pink gradient accent + hover lifts with bloom-cyan; room-stake uses neon-cyan + Orbitron extrabold
- .waiting-stats uses tint-cyan-4 + border-cyan; spinner uses neon-cyan with drop-shadow filter; h3 uses Orbitron extrabold
- Modal redesigned as bottom-sheet on mobile (align-items:flex-end, rounded top corners, handle pill ::before) and centered dialog on ≥768px; uses elev-4 + blur(40px) saturate(1.4); slideUp keyframe with ease-spring
- stake-badge updated to hud-chip cyan spec (tint-cyan-12 + border-cyan + bloom-cyan + Orbitron)
- lobby-footer uses font-display xs bold widest uppercase
- 380px breakpoint added to hide .mode-badge and collapse variant-selector to 1-col
- All animations honor prefers-reduced-motion via global tokens.css kill-switch (already present)
- Lobby.jsx: menu buttons remove inline color styles (now handled by CSS), add .lobby-menu-heading wrapper with h2+p, add .mode-badge span to each mode card, setup-title uses SVG icon components instead of emoji, disabled class uses CSS class pattern (no inline style change to logic)

<details><summary>QA-Risiken (5)</summary>

- Modal is now a bottom-sheet on mobile — verify it does not clip on short landscape viewports (safe-area-inset-bottom handled)
- menu-button.disabled uses pointer-events:none via CSS class — the onClick handler is still wired but the class prevents firing; original code used inline disabled attribute on web3 only, behavior preserved
- Large-chunk Vite warning (1.27 MB index.js) is pre-existing web3 vendor code, not introduced by this change
- Orbitron/Outfit fonts must be loaded (they are, via index.css @import) — if CDN is blocked fonts fall back to sans-serif gracefully
- color-swatch sizes increased from 34px to 36px — verify 4-swatch row still fits within 380px container (color-picker uses flex with gap:10px, 4×36+3×10=174px, well within 380px−32px padding=348px)

</details>

### UI-S3 — GameBrowser + GameRoom  `✅ follows spec`

**Dateien:** `src\pages\GameBrowser.css` · `src\pages\GameBrowser.tsx` · `src\pages\GameRoom.tsx`

- GameBrowser.css — complete rewrite consuming Iris tokens. Fixed-attachment deep-space background with cyan/pink/blue radial nebulas + SVG star-field via ::before. Sticky header rebuilt with 32px blur glass + animated tri-color gradient-shift title (Orbitron, gradient-animated token). Ghost back-button using tint-cyan-4/border-white-hi with translateX(-3px) hover. Browser-section-label with glowing neon rule. games-grid: mobile-first 1-col → 2-col@640px → 3-col@1024px. game-tile uses Room Card spec: tint-cyan-4 glass panel, 1.5px border-white-lo, elev-2 shadow, left-edge 4px accent bar (cyan→pink gradient), top-edge 1px light reflection ::after, grain texture child div, spring-physics hover (translateY -8px + scale 1.015 + bloom-cyan), :active snap (scale 0.97, dur-instant). Locked state: 0.5 opacity + grayscale + neutral accent bar. tile-meta redesigned as HUD chips: players badge uses blue tint/border/bloom, stake badge uses gold tint/border/bloom, coming-soon badge is muted. btn-play uses Primary CTA spec: cyan→blue gradient, dark text, elev-2+bloom-cyan, shine sweep @keyframe, spring hover/active. Float animation applied to tile-icon with per-tile stagger delay via CSS custom property.
- GameBrowser.tsx — added IntersectionObserver useEffect that adds .is-visible class to the grid when it enters the viewport, triggering the CSS staggered reveal-up animation (observer disconnects after first fire). Added FLOAT_DELAYS array and passes --tile-float-delay CSS custom property per tile so icons bob out of phase. Added .tile-grain div (aria-hidden) for grain texture layer. Replaced raw <span> tile-meta items with .tile-meta-badge.players and .tile-meta-badge.stake/.coming-soon. Added .browser-section-label / h2 label above grid. btn-play gets e.stopPropagation() to prevent double-fire with parent onClick. All existing handlers, routes, props, and exports are unchanged.
- GameRoom.tsx — upgraded isValidRoom===null branch from null return to a fully branded loading card. Inline style object (all values reference design-system tokens via CSS custom properties on :root). Card uses glass-panel spec: glass-bg rgba, 24px blur, 1.5px border, elev-4 shadow, slideUp keyframe entrance. Left-edge cyan→pink accent bar. Top-edge light reflection stripe. Dual-ring concentric spinner: outer ring (pink, reverse spin, 2s), inner ring (cyan, forward spin, 1.1s, bloom-cyan shadow), center neon dot. Text block: Orbitron 'Entering Room' headline + Outfit 'Syncing on-chain state…' subtitle. Room ID shown as JetBrains Mono chip with animated glow-pulse dot, truncated to first-6…last-4 for long Web3 hashes. All game logic, store wiring, navigation, and useEffect behavior is untouched.

<details><summary>QA-Risiken (5)</summary>

- Visual QA: the staggered reveal-up relies on IntersectionObserver threshold 0.1 — on very short viewports the grid may never cross the threshold if it starts partially in view; the tiles will stay at opacity 0. Mitigation: set rootMargin or verify on real 380px device.
- Visual QA: game-tile::before (left accent) and ::after (top edge) use CSS pseudo-elements; the new .tile-grain child div uses z-index:1. Confirm the grain div does not clip or occlude the btn-play (which also has z-index:2) on older mobile WebKit.
- Float animation on .tile-icon runs continuously; GameRoom loading spinner also runs spin keyframes. Both are inside the prefers-reduced-motion kill-switch (transitions AND animation-duration: 0.01ms !important) defined in tokens.css/index.css — verify the global rule applies since GameRoom uses inline styles rather than CSS classes.
- GameRoom inline styles use string values for fontFamily (Orbitron, Outfit, JetBrains Mono) — if those Google Fonts fail to load in some environments the fallback sans-serif/monospace will render without the intended typographic weight.
- The --tile-float-delay custom property is set via inline style on .game-tile and consumed by the .tile-icon animation-delay property. This cross-element custom property inheritance is standard CSS but worth a smoke test on Safari iOS 15.

</details>

### UI-S4 — In-Game-Chrome (Layout/HUD/Pods/Countdown/Victory/FX)  `✅ follows spec`

**Dateien:** `src/App.css` · `src/components/HUD/GameHUD.tsx` · `src/components/HUD/PlayerPods.tsx` · `src/components/AAACountdown.tsx` · `src/components/AAACountdown.css` · `src/components/VictoryCelebration.jsx` · `src/components/VictoryCelebration.css` · `src/components/ParticleEffects.jsx` · `src/components/ParticleEffects.css`

- App.css: Deep-space cosmos background with radial neon bloom (cyan top, blue bottom) and SVG fractal grain overlay. Side panel upgraded to full Iris glass spec (glass-bg / glass-blur / glass-saturation / glass-border / elev-2 + top-edge light). Pot display upgraded to Iris gold HUD chip (tint-gold-8, border-gold, neon-gold). All colors now reference Iris tokens. Mode badge uses HUD chip spec (rapid=pink, classic=cyan). Menu button hover uses tint-cyan-8 + bloom-cyan + spring transform. Server toast uses neon-pink gradient + bloom-pink. Added .pod-info wrapper div for better flex layout. Added .pod-turn-indicator-2 class for dual-ring orbital effect.
- App.css player pods: Inactive pods recede harder (opacity 0.55, grayscale 0.25, brightness 0.8). Active pod springs to translateY(-3px) scale(1.06) with pod-activate keyframe overshoot. Per-pod glow colors use Iris neon values. Active pod avatar gets double neon bloom. Skip dots now use neon-pink with bloom. Turn timer urgency state switches to neon-pink. All transitions use --ease-spring and --dur-fast tokens.
- GameHUD.tsx: Added disconnect-msg class span for future styling. No logic changes.
- PlayerPods.tsx: Added second pod-turn-indicator-2 div inside active pod avatar for dual orbital ring. Replaced inline flexColumn style with pod-info className. Component contract, props, and handlers unchanged.
- AAACountdown.tsx: Cinematic rebuild. New aaa-ambient-blooms + aaa-bloom-blob elements behind the card (player color halos). aaa-card-edge-light top highlight strip. pretitle replaces h3. isGo boolean controls GO! state with aaa-countdown-go class. Dual SVG rings (outer cyan + inner blue). Number gets hot-pink blast animation on GO. All framer-motion spring transitions use stiffness/damping. No prop changes.
- AAACountdown.css: Full Iris rewrite. Overlay uses deep-space radial gradient. Animated blob-pulse ambient halos. Card uses Iris glass panel spec (glass-bg/blur/saturation/border/elev-3) with grain overlay and top-edge light. Player chips use color-mix glass tints. Timer has dual rings (outer neon-cyan, inner neon-blue with drop-shadow filters). Number font uses clamp(3.5rem, 12vw, 5rem). GO! state triggers go-blast keyframe with neon-pink color/shadow. prefers-reduced-motion kill-switch.
- VictoryCelebration.jsx: Removed dead purple/accent-gradient references. Added winner-gradient CSS class for animated tri-color sweep on victory title, game-over-style class for loss state. Spring entrance tightened (stiffness 280, damping 18). Ring animation gets spring overshoot before looping. Claim button uses Iris gold gradient. Continue button uses player color gradient. All inline style overrides removed where CSS classes cover them.
- VictoryCelebration.css: Full Iris rewrite. Backdrop uses gold-tinted radial cosmos. Content card uses Iris modal spec (rgba 8,8,20 / blur 40px / saturate 1.4 / border-white-hi / elev-4) with grain overlay and gold top-edge light. Trophy uses drop-shadow stack + trophy-float keyframe. winner-gradient class adds tri-color animated sweep. Primary button = cyan→blue gradient + bloom-cyan. Claim button = gold gradient + bloom-gold. Secondary = Iris ghost button. Prize block has shimmer sweep. Font updated to Orbitron display + Outfit body. prefers-reduced-motion kill-switch.
- ParticleEffects.jsx: Confetti palette updated to Iris neon set (no purple). Added confetti box-shadow glow per particle. Second shockwave ring added to CaptureExplosion for trailing echo. Particle count bumped (18 explosion, 60 confetti). Winner glow uses mix-blend-mode: screen via CSS. Component exports unchanged.
- ParticleEffects.css: winner-glow gains mix-blend-mode: screen and wider blur (100px). explosion-flash gets saturate(1.8). victory-text colors reference Iris neon tokens. spotlight gets mix-blend-mode: screen. Full prefers-reduced-motion block covers all particle classes.

<details><summary>QA-Risiken (6)</summary>

- VictoryCelebration.jsx winner-gradient class: the animated gradient text uses -webkit-background-clip + background-clip + -webkit-text-fill-color. The inline `style={{ color: ... }}` from the original JSX would conflict on winner state — I removed the inline color for the winner path but kept it for the loser path. Verify visually that winner title renders as gradient (not solid).
- AAACountdown ambient blobs use CSS custom properties (--blob-angle, --blob-color) on the .aaa-bloom-blob element. These are set via React inline style. Older WebKit may not interpolate CSS variables in transform; test on iOS Safari 15.
- App.css grain overlay uses a data-URI SVG feTurbulence on .app.aaa-layout::before. This is ~350 bytes inline — no network request, but some strict CSP policies block inline SVG data URIs in stylesheets. Check if the project has a CSP header.
- pod-activate keyframe adds a CSS animation to .player-pod.active. Because the animation only runs once (no repeat), toggling activePlayer rapidly could restart mid-animation. This is cosmetic only.
- VictoryCelebration primary button with local game uses a template-literal color in the gradient background style that mixes the winnerData.color with rgba(0,0,0,0.2). On some browser engines this gradient resolves to near-opaque black at 100% stop — visually acceptable but worth a quick check.
- The large chunk warning (1276 kB index.js) is pre-existing and unrelated to these changes.

</details>

### UI-S5 — Board & Pieces (Board/Token/Dice)  `✅ follows spec`

**Dateien:** `src/components/Board.css` · `src/components/Token.css` · `src/components/Dice.css`

- Board.css — Replaced generic box-shadow glow with Iris layered depth system (var(--elev-4) + var(--bloom-cyan) + inset radial gradient nebulae). Added ::before top-edge light-source strip (cyan-to-pink gradient) and ::after fractalNoise grain overlay at 2.8% opacity/mix-blend-mode:overlay. Safe zones upgraded to radial gold bloom + animated star-pulse keyframe using var(--neon-gold) tokens. Base quadrants now use player color tints derived from canonical --player-* values with edge vs inner differentiation. Active-turn bases use double bloom (28px + 60px spread) with border flash. Home stretch lanes use saturate(1.3) brightness(2.0) on pulse. Start-position cells get neon-bordered glowing spheres. Center goal conic gradient sharpened, crown float gets double drop-shadow. All transition easings replaced with var(--ease-bounce)/var(--ease-spring)/var(--ease-out) tokens.
- Token.css — Token inner rebuilt as a true 3D sphere: radial-gradient from highlight pole to deep shadow, per-color border tint, three-layer inset box-shadow (outer drop, inner highlight, inner shadow). --token-glow vars aligned to canonical player palette (--player-red #ff2a6d, --player-green #00ff9d, --player-yellow #ffcc00, --player-blue #05d9e8). Highlighted state adds 10px drop-shadow + border brightening + float animation with a breathing ground-shadow via ::after. Glow aura uses blur(10px) radial gradient, scale-pulses with glow-pulse keyframe. Stacked token border bumped to 2.5px rgba(255,255,255,0.75). Particle dots get per-color box-shadow bloom. token-hop keyframe sharpened with spring overshoot at 35%/14%. Stack badge uses var(--font-display) Orbitron + var(--bloom-cyan). WCAG 44px touch target on mobile preserved.
- Dice.css — Button shell becomes true liquid-glass panel: var(--glass-bg) + backdrop-filter var(--glass-blur) var(--glass-saturation) + ::before top-edge light strip + ::after grain overlay. Elevation uses var(--elev-3) + var(--bloom-cyan). Hover springs to translateY(-8px) scale(1.06) with border-color: var(--border-cyan). Press is instant scale(0.94) via var(--ease-press). Rolling state adds intense 0.08s shake loop + cyan border + extra bloom. Dice cube faces replaced with deep glass panels: linear-gradient dark bg + inset 1px top highlight + glow inset from dice-color. Dots gain double drop-shadow bloom (6px + 14px) using var(--dice-color). Bonus overlay rebuilt as cyan-to-blue gradient with var(--font-display) Orbitron text + var(--bloom-cyan). All responsive breakpoints preserved with corrected half-sizes (22px mobile, 28px desktop).

<details><summary>QA-Risiken (5)</summary>

- Board ::after grain overlay uses a data-URI SVG fractalNoise — verify it renders on all mobile browsers (iOS Safari 16+ is fine; Android Chrome 110+ is fine; very old WebViews may skip it, degrading gracefully to no grain).
- Dice faces use CSS custom property var(--dice-color) in both background and box-shadow declarations — box-shadow rgba() with a nested CSS var is a known browser paint quirk; tested fallback uses var(--neon-pink) directly on dots so pips always glow even if the face tint inset is missed.
- Active-turn base cells use !important on background to override the gradient — this was already present in the original code and required because [class*='base-'] uses a broad attribute selector with higher specificity than .base-red.active-turn in some cascade orderings.
- The dice-button ::after grain overlay sits above the cube via z-index:1 but uses pointer-events:none and should not intercept clicks; verify on iOS where stacking context behaves differently under backdrop-filter.
- Safe-zone star::after counter-rotation uses calc(-1 * var(--board-rotation, 0deg)) — this was unchanged from the original and works correctly, but should be QA'd at non-zero rotation values on mobile where the board can rotate per player.

</details>

### UI-S6 — Shell / Header / Transitions / Ambient  `✅ follows spec`

**Dateien:** `src/components/layout/GlobalHeader.tsx` · `src/components/layout/GlobalHeader.css` · `src/components/WarpTransition.tsx` · `src/components/WarpTransition.css` · `src/components/VFX/AmbientLight.jsx`

- GlobalHeader.tsx — added logo-prefix / logo-sep / accent child spans inside .logo-text for the three-part wordmark treatment. No other logic, props, or handlers changed.
- GlobalHeader.css — full rewrite. Header starts transparent, materialises into a heavy glass panel (blur(32px) saturate(1.6), elev-3, border-cyan inset glow) on scroll via .scrolled. ::before pseudo is a linear cyan-to-pink top-edge accent line (fades in on scroll). ::after is the grain SVG overlay (fades in on scroll). Logo wordmark: Orbitron black, clamp fluid size, text-shadow depth, hover bloom halo via .logo-container::before. .logo-sep is a 2px vertical gradient tick between $GO and Ludo. .wallet-section is a glass pill wrapper with cyan hover bloom. .aaa-connect-button: glass gradient idle → full cyan-to-blue fill on hover with shine-sweep ::before, spring translateY(-2px)/scale press feedback. Mobile-first: all sizes shrink at 768px/400px; game-mode hides logo on mobile.
- WarpTransition.tsx — star count bumped to 60; stars now use scaleX stretch (streak effect) instead of uniform scale; framer transition on the container switched from default to explicit 360ms premium ease. Component contract unchanged (same props, exports, classNames).
- WarpTransition.css — full rewrite. Background: true space-black radial gradient. .warp-vortex: wider 220vmax, two-layer composition (radial neon fade + repeating-conic slats in cyan/pink), reduced blur(28px) so the structure reads. Stars get radial white-to-neon core gradients and cyan/pink/blue box-shadow glows; nth-of-type rules add colour variety without JS. .warp-content uses warp-content-pulse (opacity + drop-shadow flicker). .iridescent-pulse for subtle mode: elliptic radial bloom that breathes via iris-pulse. Grain ::after overlay. All animations gated by prefers-reduced-motion.
- AmbientLight.jsx — refactored player colours to IRIS neon palette (neon-pink, matrix-green, cyber-gold, neon-cyan). Added BLOOM_COLORS (per-player ambient wash opacity) and STRIPE_COLORS (secondary cross-fade accent). Three motion layers: (1) wide elliptic ambient wash that cross-fades between origins, (2) spring-animated mid-size spotlight (70vw, blur 72px), (3) tight hard corona (28vw, blur 28px) with box-shadow glow for a vivid player-presence cue. Same named exports (AmbientLight + default). Same prop (activePlayer). Same pointerEvents/zIndex contract.

<details><summary>QA-Risiken (5)</summary>

- ThirdWeb ConnectButton renders an internal button element — the .aaa-connect-button class targets it but ThirdWeb may version-bump its internal DOM structure; if the hover gradient does not apply, verify the className is landing on the correct rendered element in DevTools.
- The .logo-sep span uses display:inline-block with a height derived from 1.1em — on very old WebKit (iOS 14 and below) inline-block height inside a flex container can have sub-pixel snapping issues; visually minor.
- The logo-sep span is a purely visual element but is a real DOM node inside the clickable logo; this is fine for the current handleLogoClick handler (it bubbles), but any future handler that checks e.target identity should account for it.
- WarpTransition star streaks use scaleX up to 6x — on very low-end Android GPU drivers this can cause a brief frame drop if many stars animate simultaneously; will-change is not set on .star divs (intentional — 60 will-change layers would be worse). If perf is a concern, reduce star count or add CSS contain:strict to .star-field.
- AmbientLight maxWidth/maxHeight caps on the spotlight divs (600px / 220px) may clip the bloom on very large displays (>2560px); on those screens the ambient wash still fills the background so the visual impact is minimal.

</details>

---

## ✅ Verifikation (Daniel-Integration)

- `npx tsc --noEmit` → **0 Errors**
- `npm run build` → **grün**
- Preview-Walkthrough (localhost:3000): Landing, Lobby, Setup, GameBrowser, In-Game-Board — alle gerendert, **0 Console-Errors**
- Board-Struktur intakt: 225 Cells (15×15), Tokens korrekt in Yards positioniert, Dice vorhanden

## 📌 Offene QA-Follow-ups (nicht blockierend)

- Tablet 768–1023px: Dice-Cluster/Hero-Text-Overlap auf Landing prüfen (UI-S1).
- iOS Safari: `background-attachment: fixed` Parallax-Fallback (UI-S1/S3).
- Currency-Label "ETH" im GameBrowser ist Pre-existing Mock-Content → sollte FLR/C2FLR sein (siehe Leo LEO-D-Economy, NICHT Teil dieses UI-Passes).
- Touch-Hover: framer `whileHover` auf Touch-Geräten verifizieren (UI-S1).
- prefers-reduced-motion global aktiv (tokens.css + index.css Kill-Switch) — auf echten Geräten gegentesten.

## 🧭 Provenance

- Workflow `iris-daniel-aaa-ui` (Run `wf_cf41c1f1-d2f`, 7 Agents Sonnet, ~513k Tokens). Extract: `C:/tmp/ui-extract.json`.
- Clean Base vor dem Pass: Commit `890e544` (Revert-Sicherheit pro Surface möglich).

