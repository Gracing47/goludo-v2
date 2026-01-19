# 🎵 Developer Briefing: Audio Immersion & Smart RNG

## Objective
Implement a high-quality audio system to increase immersion ("Game Feel"). Additionally, refine the dice RNG to ensure a "fairer" feeling distribution of rolls.

---

## 🎧 Part 1: Sound System (New Service)

Since the old `soundService.js` was removed, please create a new, lightweight `SoundManager`.

### 1. Requirements
- **Format:** Use `.mp3` or `.wav` (Web Audio API or `HTMLAudioElement`).
- **Architecture:** Singleton pattern or React Context (`SoundContext`) to allow easy access from any component.
- **Settings:** Must include a global **Mute Toggle** (persisted in `localStorage`).

### 2. Required Sound Effects (SFX)
Trust your judgment for the audio files, but they should fit the "Premium/AAA" aesthetic.

| Event | Sound Description | Code Trigger Location |
| :--- | :--- | :--- |
| **Roll Dice** | Shaking cup + Dice rolling on wood | `handleRoll` in `App.jsx` |
| **Token Select** | Soft "pop" or "click" | `handleTokenClick` in `App.jsx` |
| **Move Step** | Wooden "clack" (per step) | `Token` animation or `engine` |
| **Capture** | Triumphant "punch" or "slide-whistle" (fun) | `gameState.lastCapture` change |
| **Goal Entry** | Celestial chime / Success chord | `Token` reaches `finished` state |
| **Win** | Fanfare / Victory loop | `gameState.winner` is set |

### 3. Background Music (BGM)
- **Style:** Lo-Fi Beats or Ambient "Strategy" music.
- **Behavior:** Loop indefinitely. Fade in on user interaction (to comply with autoplay policies).
- **UI:** Add a 🔇/🔊 toggle button in the HUD (top-right corner).

---

## 🎲 Part 2: Smart RNG (Fair Dice)

**Problem:** The user feels that rolling a '6' is too rare/hard, which kills the flow. `Math.random()` is truly random but can feel "unfair" (streaks of bad luck).

**Solution:** Implement a **"Bag System"** or **"Pity Timer"** for the Dice.

### Implementation Guide (`src/engine/gameLogic.js`)
Modify `rollDice` to use a "deck" of rolls instead of pure random:
1. Create a "bag" of numbers: `[1, 2, 3, 4, 5, 6]`.
2. Shuffle the bag.
3. Draw numbers from the bag.
4. When empty, refill and reshuffle.
   * *Outcome:* This ensures that a '6' appears exactly once every 6 rolls on average, preventing long drought streaks.

**Alternative (Pity Timer):**
- Track `rollsSinceSix`.
- If `rollsSinceSix > 6`, drastically increase the probability of rolling a 6.

*Please implement the "Bag System" (Shuffle) as it is mathematically fairer while effectively guaranteeing distribution.*

---

### 🚀 Handover
- **Audio Assets:** precise-sounds (or placeholders).
- **Files:** Create `src/services/AudioSystem.js` (or similar).
- **Integration:** Hook into `App.jsx`.
