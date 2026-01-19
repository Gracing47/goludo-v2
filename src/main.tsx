/**
 * Application Entry Point
 * 
 * Bootstraps the React application with:
 * - Thirdweb for Web3 functionality
 * - React Query for data fetching
 * - React Router for URL-based navigation
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
