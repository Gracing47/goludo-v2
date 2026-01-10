/**
 * Web3 Lobby Page
 * 
 * Browse and join Web3 game rooms.
 * Create new rooms with stakes.
 */

import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import './PlaceholderPage.css';

export const Web3LobbyPage = () => {
    const navigate = useNavigate();

    return (
        <div className="placeholder-page">
            <div className="placeholder-container">
                <button className="back-btn" onClick={() => navigate(ROUTES.HOME)}>
                    ← Back
                </button>

                <h1 className="page-title">Web3 Lobby</h1>
                <p className="page-subtitle">Browse open matches on Flare Network</p>

                <div className="placeholder-content">
                    <p className="info-text">
                        🔗 Web3 room browser will be implemented here
                    </p>
                    <p className="info-text">
                        Features:
                    </p>
                    <ul className="feature-list">
                        <li>Browse open rooms</li>
                        <li>Create room with stake</li>
                        <li>Join existing rooms</li>
                        <li>Wallet integration</li>
                    </ul>

                    <button
                        className="action-btn web3"
                        onClick={() => navigate(ROUTES.WAITING_ROOM('demo-room'))}
                    >
                        Join Demo Room 💎
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Web3LobbyPage;
