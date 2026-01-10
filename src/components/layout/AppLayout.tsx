/**
 * App Layout Component
 * 
 * Root layout that wraps all pages.
 * Uses React Router's <Outlet /> to render child routes.
 * 
 * Features:
 * - Global background and styling
 * - Container for future global UI (toasts, modals)
 * - Debug version indicator
 * 
 * @see https://reactrouter.com/en/main/components/outlet
 */

import { Outlet } from 'react-router-dom';
import './AppLayout.css';

export const AppLayout = () => {
    return (
        <div className="app-layout">
            {/* Global Header - Can add navigation, user info, etc. */}
            {/* <header className="app-header">...</header> */}

            {/* Main Content Area - Child routes render here */}
            <main className="app-main">
                <Outlet />
            </main>

            {/* Debug Info - Only visible in development */}
            {import.meta.env.DEV && (
                <div className="debug-info">
                    v0.2.0 (AAA Refactor - Phase 2)
                </div>
            )}
        </div>
    );
};

export default AppLayout;
