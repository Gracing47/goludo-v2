/**
 * Application Entry Point
 *
 * - React Query for data fetching
 * - React Router for URL-based navigation
 * - Service Worker for offline resilience
 *
 * PROD-3 perf: ThirdwebProvider is NOT mounted here at the root anymore. It is
 * mounted by AppRouter only for in-app routes, so the landing page boots
 * WITHOUT the thirdweb SDK (web3-vendor) — fixing the "slow internet" first load.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './AppRouter';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AppRouter />
            </BrowserRouter>
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
