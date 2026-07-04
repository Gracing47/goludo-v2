/**
 * App-wide toast renderer — consumes the goludo:toast CustomEvent bus
 * (src/services/toast.ts) and replaces every native alert() with a
 * non-blocking, theme-consistent notification.
 *
 * Mounted ONCE in AppRouter's AppShell. Positioned top-centre (below the
 * global header) so it never collides with the in-game HUD toast region
 * (which lives bottom-centre).
 *
 * Perf notes: GPU-only enter/exit animations, no backdrop-filter, no
 * infinite animations — safe on low-tier devices without perf-low gating.
 */

import React from 'react';
import { TOAST_EVENT, AppToastDetail, ToastKind } from '../services/toast';
import './AppToast.css';

interface ToastItem {
    id: number;
    message: string;
    kind: ToastKind;
    exiting: boolean;
}

let _counter = 0;

const LIFETIME_MS: Record<ToastKind, number> = {
    info: 3200,
    success: 3200,
    error: 5000, // errors stay longer — the user needs to read them
};
const EXIT_MS = 360; // matches --dur-normal

const KIND_ICON: Record<ToastKind, string> = {
    info: 'ℹ️',
    success: '✅',
    error: '⚠️',
};

const AppToast: React.FC = () => {
    const [toasts, setToasts] = React.useState<ToastItem[]>([]);
    const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

    React.useEffect(() => {
        const onToast = (e: Event) => {
            const detail = (e as CustomEvent<AppToastDetail>).detail;
            if (!detail?.message) return;

            const id = ++_counter;
            const kind: ToastKind = detail.kind || 'info';

            setToasts(prev => {
                // Cap stack at 3 — drop the oldest
                const capped = prev.length >= 3 ? prev.slice(1) : prev;
                return [...capped, { id, message: detail.message, kind, exiting: false }];
            });

            const exitTimer = setTimeout(() => {
                setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
                const removeTimer = setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== id));
                }, EXIT_MS);
                timersRef.current.push(removeTimer);
            }, LIFETIME_MS[kind]);
            timersRef.current.push(exitTimer);
        };

        window.addEventListener(TOAST_EVENT, onToast);
        return () => {
            window.removeEventListener(TOAST_EVENT, onToast);
            timersRef.current.forEach(clearTimeout);
        };
    }, []);

    // Tap-to-dismiss — mobile users shouldn't wait out an error toast
    const dismiss = React.useCallback((id: number) => {
        setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
        const removeTimer = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, EXIT_MS);
        timersRef.current.push(removeTimer);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="app-toast-region" role="status" aria-live="polite" aria-atomic="false">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={[
                        'app-toast',
                        `app-toast--${toast.kind}`,
                        toast.exiting ? 'app-toast--exit' : '',
                    ].join(' ').trim()}
                    onClick={() => dismiss(toast.id)}
                    role={toast.kind === 'error' ? 'alert' : undefined}
                >
                    <span className="app-toast-icon" aria-hidden="true">{KIND_ICON[toast.kind]}</span>
                    <span className="app-toast-text">{toast.message}</span>
                </div>
            ))}
        </div>
    );
};

export default AppToast;
