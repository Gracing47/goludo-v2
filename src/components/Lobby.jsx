/**
 * LOBBY COMPONENT
 * 
 * Pre-game setup screen for GoLudo:
 * - Game mode selection
 * - Player count (2-4)
 * - Color selection
 * - Player names and type (Human/AI)
 */

import React, { useState, useEffect } from 'react';
import './Lobby.css';
import { useLudoWeb3 } from '../hooks/useLudoWeb3';
import { API_URL } from '../config/api';

const COLORS = ['red', 'green', 'yellow', 'blue'];
const COLOR_NAMES = ['Red', 'Green', 'Yellow', 'Blue'];
const COLOR_EMOJIS = ['🔴', '🟢', '🟡', '🔵'];

// SVG Icons for Lobby
const UsersIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const CpuIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="15" x2="23" y2="15" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="15" x2="4" y2="15" />
    </svg>
);

const GlobeIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

const DiceIcon = ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
        <circle cx="15.5" cy="8.5" r="1" fill="currentColor" />
    </svg>
);

const Lobby = ({ onStartGame }) => {
    const { account, balance, balanceSymbol, isProcessing, handleCreateRoom, handleJoinGame } = useLudoWeb3();
    const [step, setStep] = useState('menu'); // menu, setup, web3-lobby, waiting
    const [gameMode, setGameMode] = useState(null); // local, ai, web3
    const [playerCount, setPlayerCount] = useState(2);
    const [betAmount, setBetAmount] = useState("0.1");
    const [openRooms, setOpenRooms] = useState([]);
    const [waitingRoomId, setWaitingRoomId] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null); // Track room being joined
    const [players, setPlayers] = useState([
        { name: 'Player 1', color: 'red', isAI: false },
        { name: 'Player 2', color: 'green', isAI: false },
        { name: 'Player 3', color: 'yellow', isAI: true },
        { name: 'Player 4', color: 'blue', isAI: true },
    ]);

    // Poll for rooms if in lobby
    useEffect(() => {
        if (step !== 'web3-lobby' && step !== 'waiting') return;

        const fetchRooms = async () => {
            try {
                const res = await fetch(`${API_URL}/api/rooms`);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                setOpenRooms(Array.isArray(data) ? data : []);

                if (step === 'waiting' && waitingRoomId) {
                    const room = data.find(r => r.id === waitingRoomId);
                    if (room && room.status === "ACTIVE") {
                        handleStart(room);
                    }
                }
            } catch (err) {
                setOpenRooms([]);
            }
        };

        fetchRooms();
        const interval = setInterval(fetchRooms, 3000);
        return () => clearInterval(interval);
    }, [step, waitingRoomId]);

    const handleModeSelect = (mode) => {
        if (mode === 'web3' && !account) {
            alert("Please connect your wallet first to play Web3 Match!");
            return;
        }
        setGameMode(mode);
        if (mode === 'ai') {
            setStep('setup');
            const newPlayers = [...players];
            newPlayers[1].isAI = true;
            newPlayers[2].isAI = true;
            newPlayers[3].isAI = true;
            setPlayers(newPlayers);
            setPlayerCount(2);
        } else if (mode === 'web3') {
            setStep('web3-lobby');
            setPlayerCount(2);
        } else {
            setStep('setup');
        }
    };

    const handlePlayerCountChange = (count) => {
        setPlayerCount(count);

        // Update players array
        const newPlayers = COLORS.slice(0, count).map((color, i) => ({
            name: players[i]?.name || `Player ${i + 1}`,
            color,
            isAI: gameMode === 'ai' ? i !== 0 : false
        }));

        setPlayers(newPlayers);
    };

    const handlePlayerChange = (index, field, value) => {
        setPlayers(prev => prev.map((p, i) =>
            i === index ? { ...p, [field]: value } : p
        ));
    };

    const handleCreateRoomUI = async () => {
        try {
            const player = players[0];
            const roomId = await handleCreateRoom(betAmount, playerCount, player.name, player.color);
            setWaitingRoomId(roomId);
            setStep('waiting');
        } catch (err) {
            console.error(err);
        }
    };

    const handleJoinRoomUI = (room) => {
        // Open Join Modal
        setSelectedRoom(room);
        setBetAmount(room.stake);

        // Use existing profile name or default
        const player = players[0];

        // Auto-switch color if taken in the room
        const takenColors = room.players.map(p => p.color);
        if (takenColors.includes(player.color)) {
            const availableColor = COLORS.find(c => !takenColors.includes(c));
            if (availableColor) {
                setPlayers(prev => prev.map((p, i) => i === 0 ? { ...p, color: availableColor } : p));
            }
        }
    };

    const handleJoinConfirmUI = async () => {
        if (!selectedRoom) return;
        try {
            const player = players[0];

            // Final check: is color still free?
            if (selectedRoom.players.some(p => p.color === player.color)) {
                return alert("This color was just taken by another player. Please pick a different one.");
            }

            const result = await handleJoinGame(selectedRoom.id, selectedRoom.stake, player.name, player.color);

            // Result.room contains full player list
            if (result && result.room) {
                if (result.room.status === "ACTIVE") {
                    handleStart(result.room);
                } else {
                    setWaitingRoomId(selectedRoom.id);
                    setStep('waiting');
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleStart = async (roomData = null) => {
        if (gameMode === 'web3' && step === 'setup') {
            if (selectedRoom) {
                await handleJoinConfirmUI();
            } else {
                await handleCreateRoomUI();
            }
            return;
        }

        if (gameMode === 'web3' && roomData) {
            // This triggers when waiting creator sees room is active
            onStartGame({
                mode: 'web3',
                roomId: roomData.id,
                stake: roomData.stake,
                playerCount: roomData.maxPlayers,
                players: roomData.players.map((p) => ({
                    name: p.name,
                    color: p.color,
                    address: p.address,
                    isAI: false
                }))
            });
            return;
        }

        // Local / AI start
        onStartGame({
            mode: gameMode,
            playerCount,
            players: players.slice(0, playerCount).map(p => ({
                ...p,
                name: p.isAI ? p.name + ' (AI)' : p.name
            }))
        });
    };

    const togglePlayerType = (index) => {
        const newPlayers = [...players];
        newPlayers[index].isAI = !newPlayers[index].isAI;
        setPlayers(newPlayers);
    };

    const updatePlayerName = (index, name) => {
        const newPlayers = [...players];
        newPlayers[index].name = name;
        setPlayers(newPlayers);
    };

    const selectColor = (playerIndex, color) => {
        // Check if color is already taken
        if (players.some((p, idx) => idx !== playerIndex && p.color === color)) return;

        const newPlayers = [...players];
        newPlayers[playerIndex].color = color;
        setPlayers(newPlayers);
    };

    const canStart = players.slice(0, playerCount).every(p => p.name.trim());

    return (
        <div className="lobby">
            <div className="lobby-header">
                <h1 className="lobby-title">GoLudo</h1>
                <p className="lobby-subtitle">Classic Board Game</p>
            </div>

            <div className="lobby-container">

                {/* Main Menu */}
                {step === 'menu' && (
                    <div className="lobby-menu">
                        <button
                            className="menu-button primary"
                            onClick={() => handleModeSelect('local')}
                        >
                            <span className="menu-icon" style={{ color: 'var(--pancake-cyan)' }}>
                                <UsersIcon />
                            </span>
                            <span className="menu-text">
                                <strong>Local Game</strong>
                                <small>Play with friends offline</small>
                            </span>
                        </button>

                        <button
                            className="menu-button secondary"
                            onClick={() => handleModeSelect('ai')}
                        >
                            <span className="menu-icon" style={{ color: 'var(--color-blue)' }}>
                                <CpuIcon />
                            </span>
                            <span className="menu-text">
                                <strong>vs Computer</strong>
                                <small>Challenge the AI</small>
                            </span>
                        </button>

                        <button
                            className={`menu-button web3 ${!account ? 'disabled' : ''}`}
                            onClick={() => handleModeSelect('web3')}
                        >
                            <span className="menu-icon" style={{ color: 'var(--accent-pink)' }}>
                                <GlobeIcon />
                            </span>
                            <span className="menu-text">
                                <strong>Web3 Match</strong>
                                <small>Play on Flare Network</small>
                            </span>
                        </button>

                        {account && (
                            <div className="wallet-section">
                                <button
                                    className="faucet-btn"
                                    onClick={() => window.open('https://faucet.flare.network/coston2', '_blank')}
                                >
                                    Get Test tokens (C2FLR) ↗
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Web3 Lobby */}
                {step === 'web3-lobby' && (
                    <div className="web3-lobby">
                        <header className="lobby-header">
                            <h2 className="setup-title">
                                <span className="setup-title-icon"><DiceIcon size={24} /></span>
                                Open Matches
                            </h2>
                            <button className="create-game-btn" onClick={() => setStep('setup')}>
                                + Create Game
                            </button>
                        </header>

                        <div className="room-list">
                            {openRooms.filter(r => r.status === 'WAITING').length === 0 ? (
                                <div className="no-rooms">
                                    <div className="no-rooms-icon">
                                        <DiceIcon size={48} />
                                    </div>
                                    <p>No open matches found.</p>
                                    <p><small>Be the first to create one!</small></p>
                                </div>
                            ) : (
                                openRooms.filter(r => r.status === 'WAITING').map(room => (
                                    <div key={room.id} className="room-card">
                                        <div className="room-details">
                                            <span className="room-stake">💰 {room.stake} {balanceSymbol || '$GO'}</span>
                                            <span className="room-players">👤 {room.players.length}/{room.maxPlayers}</span>
                                        </div>
                                        <button
                                            className="join-btn"
                                            onClick={() => handleJoinRoomUI(room)}
                                            disabled={isProcessing}
                                        >
                                            Join
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <button className="action-btn back" onClick={() => setStep('menu')}>
                            ← Back
                        </button>
                    </div>
                )}

                {/* Waiting Room */}
                {step === 'waiting' && (
                    <div className="waiting-room">
                        <div className="waiting-content">
                            <div className="spinner-ludo">
                                <DiceIcon size={48} />
                            </div>
                            <h3>Waiting for Opponent...</h3>
                            <p>Room: <small>{waitingRoomId.substring(0, 10)}...</small></p>
                            <div className="waiting-stats">
                                <span>Entry: <strong>{betAmount} {balanceSymbol || '$GO'}</strong></span>
                            </div>
                        </div>
                        <button className="action-btn back" onClick={() => setStep('menu')}>
                            Cancel & Leave
                        </button>
                    </div>
                )}

                {/* Game Setup */}
                {step === 'setup' && (
                    <div className="lobby-setup">
                        <h2 className="setup-title">
                            {gameMode === 'local' ? '👥 Local Game' :
                                gameMode === 'web3' ? '🔗 Web3 Match' : '🤖 vs Computer'}
                        </h2>

                        {gameMode === 'web3' && (
                            <div className="setup-section">
                                <label className="setup-label">Entry Stake ({balanceSymbol})</label>
                                <div className={`stake-selector ${selectedRoom ? 'disabled' : ''}`}>
                                    {["0.1", "1", "10", "25"].map(amount => (
                                        <button
                                            key={amount}
                                            className={`count-btn ${betAmount === amount ? 'active' : ''}`}
                                            onClick={() => setBetAmount(amount)}
                                        >
                                            {amount}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Player Count */}
                        {/* Player Count */}
                        <div className="setup-section">
                            <label className="setup-label">Number of Players</label>
                            <div className={`player-count-buttons ${selectedRoom ? 'disabled' : ''}`}>
                                {[2, 3, 4].map(count => (
                                    <button
                                        key={count}
                                        className={`count-btn ${playerCount === count ? 'active' : ''}`}
                                        onClick={() => handlePlayerCountChange(count)}
                                    >
                                        {count}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Player List */}
                        <div className="setup-section players-section">
                            <label className="setup-label">
                                {gameMode === 'web3' ? (selectedRoom ? 'Your Player Profile' : 'Creator Configuration (You)') : 'Players'}
                            </label>
                            <div className="player-list">
                                {players.slice(0, gameMode === 'web3' ? 1 : playerCount).map((player, index) => (
                                    <div key={index} className="player-config-card">
                                        <div className="player-row-header">
                                            <span className="player-label">Player {index + 1}</span>
                                            {gameMode !== 'web3' ? (
                                                <button
                                                    className={`player-type-btn ${player.isAI ? 'ai' : 'human'}`}
                                                    onClick={() => handlePlayerChange(index, 'isAI', !player.isAI)}
                                                    title={player.isAI ? 'Computer' : 'Human'}
                                                >
                                                    {player.isAI ? '🤖 Computer' : '👤 Human'}
                                                </button>
                                            ) : (
                                                <span className="player-type-badge human">👤 Human</span>
                                            )}
                                        </div>

                                        <div className="player-controls-row">
                                            <input
                                                type="text"
                                                className="player-name-input"
                                                value={player.name}
                                                onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                                                placeholder={gameMode === 'web3' ? "Your Display Name" : `Player ${index + 1}`}
                                                maxLength={12}
                                            />

                                            <div className="color-picker">
                                                {COLORS.map((c, cIdx) => {
                                                    let isTaken = false;
                                                    if (gameMode === 'web3') {
                                                        isTaken = selectedRoom ? selectedRoom.players.some(p => p.color === c) : false;
                                                    } else {
                                                        isTaken = players.slice(0, playerCount).some((p, pIdx) => pIdx !== index && p.color === c);
                                                    }
                                                    const isSelected = player.color === c;

                                                    return (
                                                        <button
                                                            key={c}
                                                            className={`color-swatch ${c} ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}`}
                                                            onClick={() => handlePlayerChange(index, 'color', c)}
                                                            title={COLOR_NAMES[cIdx]}
                                                        >
                                                            {isSelected && <span className="checkmark">✓</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>

                        {/* Actions */}
                        <div className="setup-actions">
                            <button
                                className="action-btn back"
                                onClick={() => {
                                    setStep(gameMode === 'web3' ? 'web3-lobby' : 'menu');
                                    setSelectedRoom(null);
                                }}
                            >
                                ← Back
                            </button>

                            <button
                                className="action-btn start"
                                onClick={handleStart}
                                disabled={!canStart || isProcessing}
                            >
                                {isProcessing ? 'Confirming Transaction... ⏳' :
                                    selectedRoom ? `Join & Pay Stake (${betAmount}) 💰` :
                                        gameMode === 'web3' ? 'Create & Pay Stake 💰' : 'Start Local Game 🎲'}
                            </button>
                        </div>

                        {gameMode === 'web3' && (
                            <div className="web3-info-box">
                                <p>Opponents will join from the lobby after creation.</p>
                            </div>
                        )}

                    </div>
                )}

                {/* Footer */}
                <div className="lobby-footer">
                    <p>USA Standard Rules • Safe Zones • Blockades</p>
                </div>
            </div>

            {/* --- JOIN MODAL (AAA UX) --- */}
            {selectedRoom && (
                <div className="modal-overlay">
                    <div className="modal-content join-modal">
                        <header className="modal-header">
                            <h3>Join Match</h3>
                            <div className="stake-badge">💰 {selectedRoom.stake} {balanceSymbol || 'C2FLR'}</div>
                        </header>

                        <div className="modal-body">
                            <div className="setup-section">
                                <label className="setup-label">Your Display Name</label>
                                <input
                                    type="text"
                                    className="player-name-input"
                                    value={players[0].name}
                                    onChange={(e) => handlePlayerChange(0, 'name', e.target.value)}
                                    placeholder="Enter your name"
                                    maxLength={12}
                                />
                            </div>

                            <div className="setup-section">
                                <label className="setup-label">Wähle deine Farbe</label>
                                <div className="color-picker modal-picker">
                                    {COLORS.map((c, cIdx) => {
                                        const isTaken = selectedRoom.players.some(p => p.color === c);
                                        const isSelected = players[0].color === c;

                                        return (
                                            <button
                                                key={c}
                                                className={`color-swatch ${c} ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}`}
                                                onClick={() => !isTaken && handlePlayerChange(0, 'color', c)}
                                                disabled={isTaken}
                                                title={isTaken ? `Taken by ${selectedRoom.players.find(p => p.color === c).name}` : COLOR_NAMES[cIdx]}
                                            >
                                                {isSelected && <span className="checkmark">✓</span>}
                                                {isTaken && <span className="taken-icon">❌</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedRoom.players.length > 0 && (
                                    <p className="modal-hint">
                                        Taken: {selectedRoom.players.map(p => p.name).join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="action-btn cancel"
                                onClick={() => setSelectedRoom(null)}
                                disabled={isProcessing}
                            >
                                Cancel
                            </button>
                            <button
                                className="action-btn start"
                                onClick={handleJoinConfirmUI}
                                disabled={isProcessing || !players[0].name.trim()}
                            >
                                {isProcessing ? 'Processing... ⏳' : `Pay & Join 🚀`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lobby;
