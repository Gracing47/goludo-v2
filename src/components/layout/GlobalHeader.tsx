import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { ConnectButton } from 'thirdweb/react';
import { client } from '../../config/thirdwebConfig';
import './GlobalHeader.css';

const GlobalHeader: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isLanding = location.pathname === ROUTES.LANDING;

    return (
        <header className={`global-header ${scrolled ? 'scrolled' : ''} ${isLanding ? 'is-landing' : ''}`}>
            <div className="header-container">
                <div className="header-left" onClick={() => navigate(ROUTES.LANDING)}>
                    <div className="logo-container">
                        <span className="logo-text">$GO<span className="accent">Ludo</span></span>
                    </div>
                </div>

                <div className="header-right">
                    {!isLanding && (
                        <nav className="header-nav">
                            <button
                                className="nav-link"
                                onClick={() => navigate(ROUTES.LUDO_LOBBY)}
                            >
                                Lobby
                            </button>
                        </nav>
                    )}

                    <div className="wallet-section">
                        {/* Thirdweb Connect Button with custom Styling via CSS variables */}
                        <ConnectButton
                            client={client}
                            theme={"dark"}
                            connectButton={{
                                label: "Connect",
                                className: "aaa-connect-button"
                            }}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default GlobalHeader;
