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

// PROD-3: GlobalHeader contains a static import of thirdweb/react (ConnectButton).
// Lazy-loading it ensures the thirdweb chunk is NOT pulled into the initial
// critical bundle, so the landing page renders before the SDK is fetched.
const GlobalHeader = lazy(() => import('./components/layout/GlobalHeader'));

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const GameBrowser = lazy(() => import('./pages/GameBrowser'));
const LudoLobby = lazy(() => import('./pages/LudoLobby'));
const GameRoom = lazy(() => import('./pages/GameRoom'));

// Loading fallback component
const PageLoader: React.FC = () => (
    <div className="page-loader" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'radial-gradient(circle at center, #1a1a2e 0%, #0d0d1a 100%)',
        color: 'white',
        fontFamily: 'Exo 2, sans-serif'
    }}>
        <div className="loader-spinner" style={{
            fontSize: '48px',
            marginBottom: '20px',
            animation: 'spin 2s linear infinite'
        }}>↻</div>
        <p style={{
            fontSize: '18px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            opacity: 0.8
        }}>Loading Assets...</p>
        <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
    </div>
);

/**
 * Main application router
 * All routes are defined here with proper lazy loading
 */
const AppRouter: React.FC = () => {
    return (
        <div className="app-shell">
            {/* Header has its own Suspense so the ConnectButton chunk loading
                never blocks the page content from rendering. */}
            <Suspense fallback={null}>
                <GlobalHeader />
            </Suspense>
            <main className="main-content">
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
            </main>
        </div>
    );
};

export default AppRouter;
