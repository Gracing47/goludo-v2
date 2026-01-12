/**
 * Application Entry Point
 * 
 * Bootstraps the React application with:
 * - Thirdweb for Web3 functionality
 * - React Query for data fetching
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThirdwebProvider } from 'thirdweb/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// React Query client for Thirdweb
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThirdwebProvider>
                <App />
            </ThirdwebProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
