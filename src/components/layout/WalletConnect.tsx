import { ConnectButton } from 'thirdweb/react';
import { inAppWallet, createWallet, type Wallet } from 'thirdweb/wallets';
import { client, coston2 } from '../../config/web3';

/**
 * Wallet connect UI (thirdweb). Extracted from GlobalHeader and lazy-loaded so
 * the heavy thirdweb SDK (wallets, contracts, ethers) is NOT pulled into the
 * landing-page boot bundle (PROD-3 perf). Only mounted on in-app routes.
 */
const wallets = [
    createWallet('io.metamask'),
    inAppWallet({
        auth: { options: ['google', 'apple', 'facebook', 'email'] },
    }),
    createWallet('com.coinbase.wallet'),
    createWallet('me.rainbow'),
    createWallet('com.trustwallet.app'),
];

const WalletConnect: React.FC = () => (
    <ConnectButton
        client={client}
        wallets={wallets as Wallet[]}
        accountAbstraction={{ chain: coston2, sponsorGas: true }}
        theme={'dark'}
        connectButton={{ label: 'Connect', className: 'aaa-connect-button' }}
    />
);

export default WalletConnect;
