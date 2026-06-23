import { useState } from 'react';

/**
 * usePerfTier — coarse device-capability tier for gating expensive GPU effects.
 *
 * 'low'  → weak/integrated GPU or mobile: skip large blur layers, ambient washes,
 *          and heavy continuous effects (they're the #1 cause of jank on these
 *          devices even when the CPU is fine — large-area filter/blur compositing
 *          chokes integrated and mobile GPUs).
 * 'high' → discrete GPU desktop: full effects.
 *
 * Detected once at mount (device class doesn't change mid-session). SSR-safe.
 */
export type PerfTier = 'high' | 'low';

function detectTier(): PerfTier {
    if (typeof window === 'undefined') return 'high';
    try {
        const mq = (q: string) => window.matchMedia(q).matches;

        // Respect explicit user preference.
        if (mq('(prefers-reduced-motion: reduce)')) return 'low';

        const ua = navigator.userAgent || '';
        const cores = navigator.hardwareConcurrency || 8;
        // deviceMemory is undefined on Safari/iOS → fall back to UA checks below.
        const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;

        const coarse = mq('(pointer: coarse)');
        const narrow = window.innerWidth < 900;
        const isIOS =
            /iPad|iPhone|iPod/.test(ua) ||
            (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
        const isAndroid = /Android/.test(ua);

        // Low-end signals.
        if (cores <= 4) return 'low';
        if (mem <= 4) return 'low';

        // Mobile/touch GPUs handle large-area blur poorly regardless of raw power
        // (iPhone 14 is fast but iOS Safari still janks on big filter layers).
        if (isIOS || isAndroid || coarse || narrow) return 'low';

        return 'high';
    } catch {
        return 'high';
    }
}

export function usePerfTier(): PerfTier {
    const [tier] = useState<PerfTier>(detectTier);
    return tier;
}

export default usePerfTier;
