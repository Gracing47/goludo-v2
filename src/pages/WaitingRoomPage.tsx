/**
 * Waiting Room Page
 * 
 * Waiting for opponent to join.
 * Shows room info and player status.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import './PlaceholderPage.css';

export const WaitingRoomPage = () => {
    const navigate = useNavigate();
    const { roomId } = useParams<{ roomId: string }>();

    return (
        <div className="placeholder-page">
            <div className="placeholder-container">
                <button className="back-btn" onClick={() => navigate(ROUTES.WEB3_LOBBY)}>
                    ← Back to Lobby
                </button>

                <h1 className="page-title">Waiting Room</h1>
                <p className="page-subtitle">Room: {roomId}</p>

                <div className="placeholder-content">
                    <div className="spinner">🎲</div>
                    <p className="info-text">
                        ⏳ Waiting for opponent...
                    </p>
                    <p className="info-text">
                        This page will show:
                    </p>
                    <ul className="feature-list">
                        <li>Room details (stake, players)</li>
                        <li>Connected players</li>
                        <li>Real-time updates via Socket.IO</li>
                        <li>Auto-start when room is full</li>
                    </ul>

                    <button
                        className="action-btn secondary"
                        onClick={() => navigate(ROUTES.GAME(roomId || 'demo'))}
                    >
                        Start Game (Demo) 🚀
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WaitingRoomPage;
