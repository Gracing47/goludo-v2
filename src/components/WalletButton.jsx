/**
 * WALLET CONNECT BUTTON COMPONENT
 * 
 * Provides wallet connection UI using Thirdweb
 */

import React from 'react';
import { ConnectButton } from "thirdweb/react";
import { client, defaultChain, supportedChains } from '../config/thirdwebConfig';
import './WalletButton.css';

const WalletButton = ({ onConnect, onDisconnect }) => {
    return (
        <div className="wallet-button-container">
            <ConnectButton
                client={client}
                chain={defaultChain}
                chains={supportedChains}
                connectModal={{
                    size: "compact",
                    title: "GoLudo Wallet",
                    showThirdwebBranding: false
                }}
                appMetadata={{
                    name: "GoLudo",
                    url: "https://goludo.app",
                    description: "Play Ludo on the Flare Network",
                    logoUrl: "/logo.png"
                }}
                onConnect={(wallet) => {
                    console.log("Wallet connected:", wallet);
                    onConnect?.(wallet);
                }}
                onDisconnect={() => {
                    console.log("Wallet disconnected");
                    onDisconnect?.();
                }}
            />
        </div>
    );
};

export default WalletButton;
