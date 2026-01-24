# AAA Frontend Polish - Task List

> **Goal:** Elevate $GOLudo to AAA game quality
> **Created:** 2024-01-24
> **Status:** IN PROGRESS

---

## 🚨 CRITICAL LAYOUT ISSUES (From Screenshot Analysis)

### Issue 1: Header Overlaps with Player Profiles
**Status:** 🔴 BLOCKING
**Location:** `App.css`, `App.jsx`

**Problem:** 
- Player profile pills (TOM, JER...) are positioned directly under the header
- They overlap visually with the header area
- No breathing room between header and game elements

**Fix Required:**
- [ ] Increase top padding for player pods row
- [ ] Adjust `.pos-0` and `.pos-1` (top player positions) to account for header
- [ ] Ensure safe-area-inset-top is properly respected

---

### Issue 2: Dice Component Missing/Not Visible
**Status:** 🔴 BLOCKING  
**Location:** `App.jsx`, `Dice.jsx`, `App.css`

**Problem:**
- Dice is not rendering on screen at all
- Could be z-index issue, positioning issue, or conditional rendering bug

**Investigation Points:**
- [ ] Check if dice-wrapper div is being rendered in DOM
- [ ] Verify `dice.show-X` classes are applied correctly
- [ ] Check z-index of `.central-dice-area` and `.dice-wrapper`
- [ ] Confirm game phase allows dice visibility
- [ ] Check if dice absolute positioning places it outside viewport

---

### Issue 3: Board Spacing - Too Much Space at Bottom
**Status:** 🟠 HIGH
**Location:** `App.css`, `Board.css`

**Problem:**
- Large gap between board and bottom of screen
- Board should be centered vertically but pushed slightly down toward action area
- Wasted vertical space on mobile

**Fix Required:**
- [ ] Reduce `.board-layer` padding-top (currently 60-70px)
- [ ] Adjust grid template rows for better vertical distribution
- [ ] Center board in available space after accounting for UI elements

---

## ⚠️ ACCESSIBILITY ISSUES

### Issue 4: Missing `prefers-reduced-motion` Support
**Status:** 🟠 HIGH
**Files:** All CSS with animations

**Fix Required:**
- [ ] Add reduced-motion media query to `Dice.css`
- [ ] Add reduced-motion media query to `Token.css`
- [ ] Add reduced-motion media query to `Board.css`
- [ ] Add reduced-motion media query to `LandingPage.css`

**Template:**
```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

### Issue 5: Touch Target Sizes Too Small
**Status:** 🟠 HIGH
**Files:** `App.css`

**Fix Required:**
- [ ] `.menu-btn-floating`: Increase from 32px to 44px
- [ ] Ensure all clickable elements meet 44x44px minimum

---

### Issue 6: Missing Focus States
**Status:** 🟡 MEDIUM
**Files:** `Dice.css`, `App.css`

**Fix Required:**
- [ ] Add `:focus-visible` states to `.dice-button`
- [ ] Add `:focus-visible` states to all interactive buttons

---

## 🎨 DESIGN VIOLATIONS (Per GEMINI.md Skills)

### Issue 7: Purple Color Usage (PURPLE BAN)
**Status:** 🟡 MEDIUM
**Files:** `Dice.css`, `index.css`

**Locations:**
- `Dice.css` line 41: `rgba(168, 85, 247, 0.15)`
- `Dice.css` line 50: `rgba(168, 85, 247, 0.3)`
- `Dice.css` line 366: `rgba(168, 85, 247, 0.95)`
- `index.css` line 182: `--accent-purple: #8b5cf6`

**Fix Required:**
- [ ] Replace purple with cyan `#00f3ff` or gold `#ffd700`
- [ ] Update bonus overlay to use cyan or pink accent

---

### Issue 8: Emoji Usage as Icons (Board Crown)
**Status:** 🟡 MEDIUM
**File:** `Board.css` line 243

**Fix Required:**
- [ ] Replace `👑` emoji with SVG crown icon or Unicode symbol with proper font

---

## 🔧 CODE QUALITY ISSUES

### Issue 9: JSX Files Need TypeScript Migration
**Status:** 🟢 LOW (Later Phase)
**Files:** `Dice.jsx`, `Token.jsx`, `Board.jsx`, `Lobby.jsx`

**Fix Required:**
- [ ] Convert `Dice.jsx` → `Dice.tsx` with proper types
- [ ] Convert `Token.jsx` → `Token.tsx` with proper types
- [ ] Convert `Board.jsx` → `Board.tsx` with proper types

---

### Issue 10: Z-Index Scale Not Defined
**Status:** 🟢 LOW
**Files:** Multiple

**Fix Required:**
- [ ] Define z-index scale in `:root`
- [ ] Refactor all z-index values to use variables

---

## 📋 EXECUTION ORDER

### Phase 1: Critical Layout (NOW)
1. [x] Fix dice visibility (BLOCKING) ✅ Now shows during all game phases
2. [x] Fix header/profile overlap ✅ Adjusted pod positions and container offset
3. [x] Optimize board vertical spacing ✅ Reduced padding, better distribution

### Phase 2: Accessibility
4. [x] Add prefers-reduced-motion ✅ Added global support in index.css
5. [x] Fix touch target sizes ✅ Menu button now 44x44px
6. [x] Add focus states ✅ Added focus-visible to dice button

### Phase 3: Design Polish
7. [x] Remove purple colors ✅ Replaced with cyan in Dice.css
8. [ ] Replace emoji with SVG
9. [ ] Final visual review

### Phase 4: Code Quality (Later)
10. [ ] TypeScript migration
11. [ ] Z-index refactor

---

## 📊 PROGRESS TRACKER

| Phase | Items | Completed | Status |
|-------|-------|-----------|--------|
| Phase 1 - Critical | 3 | 3 | ✅ |
| Phase 2 - A11y | 3 | 3 | ✅ |
| Phase 3 - Design | 2 | 1 | 🟡 |
| Phase 4 - Code | 2 | 0 | ⏳ |
| **TOTAL** | **10** | **7** | **70%** |

---

## 🖼️ Reference Screenshot

Current state shows:
- ✅ Board renders correctly with all colors
- ✅ Tokens visible in correct positions
- ❌ Player pods overlap with header area
- ❌ Dice not visible anywhere
- ⚠️ Too much dead space below board
- ⚠️ Version text "v4.3 - Robust Reconnect" visible (should be hidden in game)

---

*Last Updated: 2024-01-24 13:29*
