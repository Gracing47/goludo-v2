/**
 * useFpsWatchdog — runtime FPS sentinel that latches perf-low if the device
 * drops below the frame-rate budget during play.
 *
 * G-009 tuning (iPhone-12 finding — jank was ~1s BURSTS during dice rolls /
 * token moves that a 2s average never caught):
 * - window shrunk 2s → 1s and threshold 50 → 48 fps (less dilution)
 * - NEW burst detector: 6 frames ≥ 34ms (< ~30fps) inside one window latch
 *   immediately — a 1s dice-roll stutter latches after ~240ms of jank
 *   instead of never
 * - `enabled` param: statically-low devices (usePerfTier → 'low') skip the
 *   rAF loop entirely (the old mount-time class guard raced the effect that
 *   sets the class and therefore never fired)
 * - Discontinuity guard: a frame delta ≥750ms means the tab/app was hidden
 *   (rAF pauses) — the window is restarted instead of judged, otherwise one
 *   tab switch would false-latch perf-low on healthy high-end devices
 *
 * Design constraints (unchanged):
 * - SSR-safe (typeof window guard at top)
 * - Zero per-frame allocations — integer counters only
 * - No React state mutation — touches only document.documentElement.classList
 * - Escalate-only latch: once perf-low is set it is never removed by this hook
 */

import { useEffect } from 'react';

export function useFpsWatchdog(enabled: boolean = true): void {
    useEffect(() => {
        if (!enabled) return;
        if (typeof window === 'undefined') return;
        const root = document.documentElement;
        if (root.classList.contains('perf-low')) return;

        // All mutable state as plain number vars — no objects, no closures per frame
        const warmupMs       = 1000;
        const windowMs       = 1000; // sliding average window
        const avgThreshold   = 48;   // fps — average escalation
        const longFrameMs    = 34;   // ≥34ms frame ≈ below 30fps
        const longFrameLimit = 6;    // 6 long frames per window = burst jank → latch
        const gapResetMs     = 750;  // ≥750ms delta = tab switch / app background, NOT jank

        let rafId: number;
        let warmupStart: number;
        let windowStart: number = 0;
        let frameCount: number  = 0;
        let longFrames: number  = 0;
        let lastTs: number      = 0;
        let warmedUp: number    = 0; // 0 = false, 1 = true (avoids boolean boxing)

        function tick(timestamp: number): void {
            if (!warmedUp) {
                if (timestamp - warmupStart >= warmupMs) {
                    warmedUp    = 1;
                    windowStart = timestamp;
                    lastTs      = timestamp;
                    frameCount  = 0;
                    longFrames  = 0;
                }
                rafId = requestAnimationFrame(tick);
                return;
            }

            // Discontinuity guard (adversarial-review fix): rAF pauses while the
            // tab/app is hidden, so the frame after returning carries a huge
            // delta AND a huge window `elapsed` — without this guard a single
            // tab switch would false-latch perf-low on a healthy high-end
            // device (avgFps = old frameCount / seconds away). Real jank never
            // produces one isolated ≥750ms frame; real freezes latch via the
            // 34ms-burst path around them. → restart the window, don't judge it.
            if (timestamp - lastTs >= gapResetMs) {
                windowStart = timestamp;
                lastTs      = timestamp;
                frameCount  = 0;
                longFrames  = 0;
                rafId = requestAnimationFrame(tick);
                return;
            }

            frameCount++;

            // Burst detector — catches short (~1s) roll/move stutters that a
            // window average would dilute below the threshold.
            if (timestamp - lastTs >= longFrameMs) {
                longFrames++;
                if (longFrames >= longFrameLimit) {
                    root.classList.add('perf-low');
                    return; // STOP — latch is permanent, never re-enter
                }
            }
            lastTs = timestamp;

            const elapsed = timestamp - windowStart;
            if (elapsed >= windowMs) {
                const avgFps = frameCount / (elapsed / 1000);
                if (avgFps < avgThreshold) {
                    root.classList.add('perf-low');
                    return; // STOP — latch is permanent, never re-enter
                }
                // Another instance/tab logic may have latched meanwhile — stop looping
                if (root.classList.contains('perf-low')) return;
                // Good window — slide forward
                windowStart = timestamp;
                frameCount  = 0;
                longFrames  = 0;
            }

            rafId = requestAnimationFrame(tick);
        }

        warmupStart = performance.now();
        rafId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [enabled]);
}

export default useFpsWatchdog;
