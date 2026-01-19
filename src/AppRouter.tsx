/**
 * App Router
 * 
 * Central routing configuration for the GoLudo application.
 * Uses React Router v6 with lazy loading for optimal bundle splitting.
 * 
 * @see docs/URL_ROUTING_ANALYSIS.md
 * @see src/config/routes.ts
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './config/routes';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const GameBrowser = lazy(() => import('./pages/GameBrowser'));
const LudoLobby = lazy(() => import('./pages/LudoLobby'));
const GameRoom = lazy(() => import('./pages/GameRoom'));

// Loading fallback component
const PageLoader: React.FC = () => (
    <div className="page-loader">
        <div className="loader-spinner">↻</div>
        <p>Loading...</p>
    </div>
);

/**
 * Main application router
 * All routes are defined here with proper lazy loading
 */
const AppRouter: React.FC = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* Landing Page */}
                <Route path={ROUTES.LANDING} element={<LandingPage />} />

                {/* Game Browser */}
                <Route path={ROUTES.APP} element={<GameBrowser />} />

                {/* Ludo Lobby */}
                <Route path={ROUTES.LUDO_LOBBY} element={<LudoLobby />} />

                {/* Local Game Setup - redirect to lobby for now */}
                <Route path={ROUTES.LUDO_LOCAL} element={<Navigate to={ROUTES.LUDO_LOBBY} replace />} />

                {/* Active Game Room */}
                <Route path={ROUTES.GAME} element={<GameRoom />} />

                {/* Fallback - redirect to landing */}
                <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
            </Routes>
        </Suspense>
    );
};

export default AppRouter;
