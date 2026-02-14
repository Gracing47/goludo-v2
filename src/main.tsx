/**
 * Application Entry Point
 * 
 * Bootstraps the React application with:
 * - Thirdweb for Web3 functionality
 * - React Query for data fetching
 * - React Router for URL-based navigation
 * - Service Worker for offline resilience
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThirdwebProvider } from 'thirdweb/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './AppRouter';
import './index.css';

// React Query client for Thirdweb
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThirdwebProvider>
                <BrowserRouter>
                    <AppRouter />
                </BrowserRouter>
            </ThirdwebProvider>
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
