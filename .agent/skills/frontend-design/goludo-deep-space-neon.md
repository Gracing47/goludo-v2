# DEEP SPACE NEON — goludo-v2 Design Language

> The established visual system for goludo-v2. Source of truth: `src/design-system/tokens.css` + `src/index.css` (61 tokens). Owned by **Iris**, implemented by **Daniel**. Full per-surface record: `docs/_internal/INSIDE-TICKET-AAA-UI-ENHANCEMENT.md`.

## Big idea

GoLudo lives in the void between stars — panels float in true layered depth over a fixed near-black cosmos, lit from beneath by electric neon bloom rather than flat glow. Every surface has physical weight (ambient + direct shadow + faint grain). Typography either whispers (Outfit body) or screams (Orbitron display at clamp sizes past 5xl). Motion follows physics: spring-overshoot entries, instant-snap press, GPU-only transforms.

## Typography

- **Display:** Orbitron (weights 400–900; 800/900 for hero lockups). Hero: `clamp(var(--text-5xl), 14vw, var(--text-7xl))`, `--font-black`, `--tracking-wide`.
- **Body:** Outfit (humanist grotesque, warmer than Inter).
- **Mono:** JetBrains Mono (on-chain addresses, code).
- Scale extended to `--text-6xl` (4rem) / `--text-7xl` (5.5rem). HUD labels: `--text-xs`, `--font-bold`, `--tracking-widest`, uppercase.

## Color — brand neon (HARD RULE: no purple / violet / indigo)

| Token | Hex | Use |
|-------|-----|-----|
| `--neon-cyan` | `#00f3ff` | primary interactive chrome, focus rings, active borders, stat values |
| `--neon-blue` | `#3a86ff` | secondary accent, info, secondary fills |
| `--neon-pink` | `#ff007a` | primary CTAs, active/selected, danger, strongest contrast |
| `--neon-gold` | `#ffd700` | reward/stake/win/currency callouts |

Background stays pure space-navy: `#06060f` base → `#0b0b1e` → `#080e1a`. `--glow-purple` / `--color-secondary` are remapped to neon-blue for backward compatibility.

## Principles

**Layout** — mobile-first stack at 380px; expand at 768/1024. Panels float (`isolation: isolate` so grain/edge pseudo-elements clip inside radius). Asymmetric tension on heroes (oversized type offset, decorative object anchored opposite corner). Strict z-index ladder: board(1) → hud(10) → dropdown(50) → overlay(100) → modal(200) → toast(300) → tooltip(400).

**Motion** — spring entrances via `--ease-spring` `cubic-bezier(0.175,0.885,0.32,1.275)`; press = instant-down `scale(0.97)` + `--ease-press` release; staggered reveals via `.reveal-up.reveal-stagger`; animate ONLY transform/opacity; duration ladder `--dur-fast` 180ms / `--dur-normal` 360ms / `--dur-crawl` 2400ms; global `@media (prefers-reduced-motion: reduce)` kill-switch collapses durations to 0.01ms.

**Depth** — never a single box-shadow. Elevation `--elev-0…4` (ambient layer + direct shadow). `--bloom-cyan/blue/pink/gold` multi-stop glows (16/48/96px) push interactive panels off the background. Grain overlay (SVG fractalNoise ~3% opacity, `mix-blend-mode: overlay`). `.glass-card::before` 1px top-edge light. `backdrop-filter: blur(24px) saturate(1.6)`.

## Component patterns (11)

Primary CTA (cyan→blue gradient) · Pink CTA (pink→blue + shine-sweep) · Ghost/Back button · Glass Panel/Card · Menu Button (left accent strip per variant) · HUD Chip/Badge (cyan/pink/gold/blue, ≥44px touch) · Stat Card (staggered reveal) · Player Config Card · Input Field · Room Card (web3 lobby) · Modal/Sheet (bottom-sheet on mobile). Full CSS specs in the inside-ticket (`UI-P1…P11`).

## Token map (61)

- **Neon + tints:** `--neon-{cyan,blue,pink,gold}`, `--tint-{color}-{4,8,12,20}`
- **Borders:** `--border-{cyan,blue,pink,gold,white-lo,white-hi}`
- **Surfaces:** `--bg-{raised,card-hover,contrast-lo,contrast-md,contrast-hi}`, `--glass-saturation`
- **Type:** `--text-{6xl,7xl}`, `--font-black`, `--leading-{none,snug}`, `--tracking-{tight,wider,widest}`
- **Space/Radius:** `--space-32`, `--radius-xs`
- **Elevation:** `--elev-0…4`
- **Bloom:** `--bloom-{cyan,blue,pink,gold}`
- **Motion:** `--dur-{instant,fast,normal,slow,slower,crawl}`, `--ease-spring`, `--ease-press`
- **Gradients:** `--gradient-hero`, `--gradient-animated`

## Do / Don't

✅ Consume `var(--…)`; lock shared tokens before redesigning multiple surfaces; verify at 380px + reduced-motion; keep tsc/build green; change visuals only (never logic/props/handlers).
❌ Per-surface palettes; glow-only depth; safe 50/50 hero; purple; logic edits dressed as "design".
