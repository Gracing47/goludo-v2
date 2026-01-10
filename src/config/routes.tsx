/**
 * Router Configuration - React Router v6
 * 
 * Centralized routing configuration using React Router v6.
 * Implements best practices:
 * - Nested routes with layouts
 * - Lazy loading for code splitting
 * - Type-safe route parameters
 * - Error boundaries per route
 * 
 * @see https://reactrouter.com/en/main
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layouts
import AppLayout from '../components/layout/AppLayout';

// Loading component
const LoadingScreen = () => (
    <div className="loading-screen">
        <div className="spinner">🎲</div>
        <p>Loading...</p>
    </div>
);

/**
 * Lazy load pages for code splitting
 * Each page is loaded only when needed
 */
const HomePage = lazy(() => import('../pages/HomePage'));
const GameModesPage = lazy(() => import('../pages/GameModesPage'));
const GameSetupPage = lazy(() => import('../pages/GameSetupPage'));
const Web3LobbyPage = lazy(() => import('../pages/Web3LobbyPage'));
const WaitingRoomPage = lazy(() => import('../pages/WaitingRoomPage'));
const GamePage = lazy(() => import('../pages/GamePage'));

/**
 * Error boundary component for route errors
 */
const ErrorBoundary = () => (
    <div className="error-boundary">
        <h1>Oops! Something went wrong</h1>
        <p>Please try refreshing the page or go back to the home page.</p>
        <a href="/">← Back to Home</a>
    </div>
);

/**
 * Wrap lazy-loaded components with Suspense
 */
const withSuspense = (Component: React.LazyExoticComponent<() => JSX.Element>) => {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <Component />
        </Suspense>
    );
};

/**
 * Application Router
 * 
 * Route Structure:
 * /                    → HomePage (Menu)
 * /modes               → GameModesPage (Mode Selection)
 * /setup/:mode         → GameSetupPage (Player Config)
 * /lobby/web3          → Web3LobbyPage (Room Browser)
 * /waiting/:roomId     → WaitingRoomPage (Waiting)
 * /game/:gameId        → GamePage (Active Game)
 */
export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppLayout />,
        errorElement: <ErrorBoundary />,
        children: [
            {
                index: true,
                element: withSuspense(HomePage),
            },
            {
                path: 'modes',
                element: withSuspense(GameModesPage),
            },
            {
                path: 'setup/:mode',
                element: withSuspense(GameSetupPage),
            },
            {
                path: 'lobby',
                children: [
                    {
                        path: 'web3',
                        element: withSuspense(Web3LobbyPage),
                    },
                ],
            },
            {
                path: 'waiting/:roomId',
                element: withSuspense(WaitingRoomPage),
            },
            {
                path: 'game/:gameId',
                element: withSuspense(GamePage),
            },
            {
                // Catch-all redirect to home
                path: '*',
                element: <Navigate to="/" replace />,
            },
        ],
    },
]);

/**
 * Type-safe route paths
 * Use these constants instead of hardcoded strings
 * 
 * @example
 * ```tsx
 * import { ROUTES } from '@config/routes';
 * 
 * navigate(ROUTES.GAME_MODES);
 * navigate(ROUTES.SETUP('ai'));
 * navigate(ROUTES.GAME('room-123'));
 * ```
 */
export const ROUTES = {
    HOME: '/',
    GAME_MODES: '/modes',
    SETUP: (mode: string) => `/setup/${mode}`,
    WEB3_LOBBY: '/lobby/web3',
    WAITING_ROOM: (roomId: string) => `/waiting/${roomId}`,
    GAME: (gameId: string) => `/game/${gameId}`,
} as const;
