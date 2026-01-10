/**
 * Application Entry Point
 * 
 * Bootstraps the React application with:
 * - React Router v6 for navigation
 * - Thirdweb for Web3 functionality
 * - React Query for data fetching
 * 
 * Phase 2: Switched from monolithic App to RouterProvider
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ThirdwebProvider } from 'thirdweb/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './config/routes';
import './index.css';

// React Query client for Thirdweb
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThirdwebProvider>
                {/* AAA Router Structure - Phase 2 */}
                <RouterProvider router={router} />
            </ThirdwebProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
