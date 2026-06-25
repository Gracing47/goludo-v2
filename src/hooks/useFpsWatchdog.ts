/**
 * useFpsWatchdog — runtime FPS sentinel that latches perf-low if the device
 * drops below 50 fps during play.
 *
 * Design constraints:
 * - SSR-safe (typeof window guard at top)
 * - Zero per-frame allocations — integer counters only, no array push / Date.now()
 * - No React state mutation — touches only document.documentElement.classList
 * - Escalate-only latch: once perf-low is set it is never removed by this hook
 * - If perf-low is already present (set by usePerfTier static detection) skip watchdog
 */

import { useEffect } from 'react';

export function useFpsWatchdog(): void {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (document.documentElement.classList.contains('perf-low')) return;

        // All mutable state as plain number vars — no objects, no closures per frame
        const warmupMs  = 1000;
        const windowMs  = 2000;
        const threshold = 50; // fps

        let rafId: number;
        let warmupStart: number;
        let windowStart: number  = 0;
        let frameCount: number   = 0;
        let warmedUp: number     = 0; // 0 = false, 1 = true (avoids boolean boxing)

        function tick(timestamp: number): void {
            if (!warmedUp) {
                if (timestamp - warmupStart >= warmupMs) {
                    warmedUp    = 1;
                    windowStart = timestamp;
                    frameCount  = 0;
                }
                rafId = requestAnimationFrame(tick);
                return;
            }

            frameCount++;

            const elapsed = timestamp - windowStart;
            if (elapsed >= windowMs) {
                const avgFps = frameCount / (elapsed / 1000);
                if (avgFps < threshold) {
                    document.documentElement.classList.add('perf-low');
                    return; // STOP — latch is permanent, never re-enter
                }
                // Good window — slide forward
                windowStart = timestamp;
                frameCount  = 0;
            }

            rafId = requestAnimationFrame(tick);
        }

        warmupStart = performance.now();
        rafId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafId);
        };
    }, []); // run once on mount
}

export default useFpsWatchdog;
