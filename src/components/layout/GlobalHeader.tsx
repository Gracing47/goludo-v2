import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import GraphicsSettings from '../settings/GraphicsSettings';
import './GlobalHeader.css';

// PROD-3 perf: the thirdweb wallet UI is lazy-loaded and ONLY mounted on
// in-app routes. The landing page shows a lightweight button instead, so the
// homepage never pulls the heavy thirdweb SDK (wallets/contracts/ethers) into
// its boot bundle — fixing the "slow internet" first-load feel.
const WalletConnect = lazy(() => import('./WalletConnect'));

const GlobalHeader: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isLanding = location.pathname === ROUTES.LANDING;
    const isGameMode = location.pathname.startsWith('/game/'); // Detect game room pages

    const handleLogoClick = () => {
        // Force full page refresh to landing
        window.location.href = '/';
    };

    return (
        <header className={`global-header ${scrolled ? 'scrolled' : ''} ${isLanding ? 'is-landing' : ''} ${isGameMode ? 'game-mode' : ''}`}>
            <div className="header-container">
                <div className="header-left" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
                    <div className="logo-container">
                        <span className="logo-text">
                            <span className="logo-prefix">$GO</span>
                            <span className="logo-sep" aria-hidden="true" />
                            <span className="accent">Ludo</span>
                        </span>
                    </div>
                </div>

                <div className="header-right">
                    <GraphicsSettings />
                    <div className="wallet-section">
                        {isLanding ? (
                            // Landing: lightweight CTA — no thirdweb on the homepage.
                            <button
                                type="button"
                                className="aaa-connect-button"
                                onClick={() => navigate(ROUTES.LUDO_LOBBY)}
                            >
                                Launch App
                            </button>
                        ) : (
                            // In-app: lazy-load the real wallet connect (thirdweb).
                            <Suspense
                                fallback={
                                    <button type="button" className="aaa-connect-button" disabled>
                                        Connect
                                    </button>
                                }
                            >
                                <WalletConnect />
                            </Suspense>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default GlobalHeader;
