/**
 * Settings Store — persisted user preferences (Zustand + persist).
 *
 * graphics: how much visual effect the game renders. This is a USER override
 * on top of the automatic device detection (usePerfTier) and the runtime FPS
 * watchdog. G-009 made the game adapt automatically; this puts the final call
 * in the player's hands for the cases auto-detection can't know about (an old
 * phone that reports many cores, or a strong device the owner still wants dead
 * smooth).
 *
 *   'auto'   → detect device tier + runtime FPS watchdog (default).
 *   'smooth' → force perf-low: minimal animation, maximum smoothness
 *              (2D flip-strip dice, no blur/glow layers). Best for older phones.
 *   'high'   → force full effects AND disable the auto-downgrade watchdog, so a
 *              strong device is never dropped to the low path mid-session.
 *
 * Persisted under localStorage key `goludo-settings` so the choice survives
 * reloads and new game rooms.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GraphicsPreference = 'auto' | 'smooth' | 'high';

interface SettingsState {
    graphics: GraphicsPreference;
    setGraphics: (graphics: GraphicsPreference) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            graphics: 'auto',
            setGraphics: (graphics) => set({ graphics }),
        }),
        { name: 'goludo-settings' },
    ),
);

export default useSettingsStore;
