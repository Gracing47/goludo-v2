# Task: GoLudo UI/UX Renaissance 🎲

Transforming the current GoLudo UI from a mobile-stretched layout into a polished, AAA Web3 gaming experience with proven DeFi (Uniswap/PancakeSwap) aesthetics.

## 🛠️ Tech Stack & Constraints
- **Framework:** React + Tailwind (Implicitly available via custom CSS)
- **Status:** Logic is working, UI/UX needs "The Maestro" touch.
- **Goal:** AAA Polish, perfect mobile-first but decent desktop, no breaking logic.

## 📋 Phases

### Phase 1: Foundation & Global Tokens
- [ ] **Reset & Shell**: Implement `padding-top: env(safe-area-inset-top)` to fix hidden headers.
- [ ] **Global Design Tokens**: Refine CSS variables in `index.css` for "Web3 Premium" (sharper borders, layered shadows).
- [ ] **AppShell**: Create a global Header (floating) so it's consistent across Landing, Lobby, and Game.

### Phase 2: The Lobby Overhaul (Priority)
- [ ] **Fix Desktop Layout**: Stop the Lobby from being a tiny strip on Desktop. Implement a max-width container with elegant padding.
- [ ] **Resolve Overlaps**: Fix the "GoLudo" logo clashing with mode buttons.
- [ ] **AAA Mode Cards**: Update `Lobby.css` to use high-quality transitions and borders.

### Phase 3: UX & Interaction Polish
- [ ] **Tactile Feedback**: Add `scale: 0.98` on active and `scale: 1.02` on hover for all buttons.
- [ ] **Icon Replacement**: Replace text-emojis with proper SVG structures where applicable (without adding deps if possible, or using Lucide/Heroicons if available).

### Phase 4: Page Specific Polish
- [ ] **Landing Page**: Add a proper Navbar. Improve the "Why GoLudo" section contrast.
- [ ] **Game Page**: Ensure the board is perfectly centered and UI elements don't overlap on small screens.

## 🧪 Verification Criteria
- [x] No content hidden behind mobile status bars.
- [x] Desktop version looks like a "Game Dashboard", not a stretched mobile app.
- [x] Logo is clearly visible and doesn't overlap text.
- [x] All buttons have hover/active states.
