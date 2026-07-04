/**
 * Global toast bus — tiny CustomEvent-based pub/sub so non-component code
 * (hooks, services) can surface user-facing messages without alert().
 *
 * Consumed by <AppToast /> (mounted once in AppRouter's AppShell).
 */

export type ToastKind = 'info' | 'success' | 'error';

export interface AppToastDetail {
    message: string;
    kind: ToastKind;
}

export const TOAST_EVENT = 'goludo:toast';

/** Show a toast anywhere in the app. Replaces native alert(). */
export function showToast(message: string, kind: ToastKind = 'info'): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<AppToastDetail>(TOAST_EVENT, { detail: { message, kind } })
    );
}
