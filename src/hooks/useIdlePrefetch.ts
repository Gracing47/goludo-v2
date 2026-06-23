import { useEffect } from 'react';

export const useIdlePrefetch = () => {
    useEffect(() => {
        const prefetch = () => {
            // Dynamically import heavy routes and thirdweb components to cache them
            import('thirdweb/react').catch(() => {});
            import('../pages/LudoLobby').catch(() => {});
            import('../pages/GameBrowser').catch(() => {});
            import('../pages/GameRoom').catch(() => {});
        };

        if ('requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(() => {
                // Wait 1.5 seconds for landing page interactive frame to settle
                setTimeout(prefetch, 1500);
            });
            return () => window.cancelIdleCallback(idleId);
        } else {
            const timeoutId = setTimeout(prefetch, 2500);
            return () => clearTimeout(timeoutId);
        }
    }, []);
};
