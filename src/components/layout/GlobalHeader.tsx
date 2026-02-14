import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { ConnectButton } from 'thirdweb/react';
import { client } from '../../config/web3';
import './GlobalHeader.css';

import { inAppWallet, createWallet } from 'thirdweb/wallets';
import { coston2 } from '../../config/web3';

const wallets = [
    createWallet("io.metamask"),
    inAppWallet({
        auth: {
            options: [
                "google",
                "apple",
                "facebook",
                "email"
            ],
        },
    }),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
    createWallet("com.trustwallet.app"),
];

const GlobalHeader: React.FC = () => {
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

    const handleLogoClick = () => {
        // Force full page refresh to landing
        window.location.href = '/';
    };

    return (
        <header className={`global-header ${scrolled ? 'scrolled' : ''} ${isLanding ? 'is-landing' : ''}`}>
            <div className="header-container">
                <div className="header-left" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
                    <div className="logo-container">
                        <span className="logo-text">$GO<span className="accent">Ludo</span></span>
                    </div>
                </div>

                <div className="header-right">
                    <div className="wallet-section">
                        {/* Thirdweb Connect Button with custom Styling via CSS variables */}
                        <ConnectButton
                            client={client}
                            wallets={wallets}
                            accountAbstraction={{
                                chain: coston2,
                                sponsorGas: true
                            }}
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
