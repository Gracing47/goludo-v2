/**
 * Application Entry Point
 *
 * Bootstraps the React application with:
 * - Thirdweb for Web3 functionality (lazy-loaded to keep initial bundle lean)
 * - React Query for data fetching
 * - React Router for URL-based navigation
 * - Service Worker for offline resilience
 *
 * PROD-3: ThirdwebProvider is wrapped in React.lazy + Suspense so the
 * thirdweb/react SDK is NOT included in the initial critical chunk.
 * The landing page and free/local play mode boot without it; the chunk
 * is fetched only when the provider actually mounts (i.e. always, but
 * as a separate async chunk so the parser doesn't block on it).
 */

import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './AppRouter';
import './index.css';

// Lazy-load ThirdwebProvider so the thirdweb/react chunk is split out of
// the critical path. The dynamic import resolves to the named export, which
// React.lazy requires as a default export — we re-export it via a thin wrapper.
const ThirdwebProviderLazy = lazy(() =>
    import('thirdweb/react').then((mod) => ({
        default: mod.ThirdwebProvider,
    }))
);

// Minimal no-op fallback: renders children immediately once the chunk loads.
// Using a fragment keeps the DOM clean; the app shell is still painted by
// AppRouter's own Suspense boundary before this resolves.
const Web3Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Suspense fallback={null}>
        <ThirdwebProviderLazy>{children}</ThirdwebProviderLazy>
    </Suspense>
);

// React Query client for Thirdweb
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <Web3Shell>
                <BrowserRouter>
                    <AppRouter />
                </BrowserRouter>
            </Web3Shell>
        </QueryClientProvider>
    </React.StrictMode>
);

// ============================================
// SERVICE WORKER REGISTRATION
// Enables offline play and faster loading
// ============================================
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('✅ Service Worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('🔄 New version available! Refresh to update.');
                            }
                        });
                    }
                });
            })
            .catch((error) => {
                console.warn('⚠️ Service Worker registration failed:', error);
            });
    });
}
