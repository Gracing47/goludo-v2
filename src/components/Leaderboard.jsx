/**
 * Leaderboard (G-023)
 *
 * Season-1 leaderboard overlay for the web3 lobby. Reads the existing
 * backend routes (`/api/leaderboard/:metric`, G-018) — XP, wins and $GO won.
 * Purely additive: closes on backdrop click, never blocks the lobby.
 */
import React, { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import { STAKE_CURRENCY_SYMBOL } from '../config/currency';
import { weiToGo, shortAddr } from '../utils/format';
import './Leaderboard.css';

const TABS = [
    { key: 'totalXp', label: '⭐ XP' },
    { key: 'totalWins', label: '🏆 Wins' },
    { key: 'totalWon', label: `💰 $${STAKE_CURRENCY_SYMBOL} Won` },
];

// totalWon is stored in wei — humanize; XP/wins are plain numbers
const fmtValue = (metric, row) => {
    const v = row?.[metric];
    if (metric === 'totalWon') return weiToGo(v);
    return Number(v ?? 0).toLocaleString();
};

const MEDALS = ['🥇', '🥈', '🥉'];

const Leaderboard = ({ onClose, ownAddress }) => {
    const [metric, setMetric] = useState('totalXp');
    const [rows, setRows] = useState(null); // null = loading, [] = empty
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        setRows(null);
        setError(false);
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/leaderboard/${metric}?limit=25`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (alive) setRows(Array.isArray(data) ? data : []);
            } catch {
                if (alive) { setError(true); setRows([]); }
            }
        })();
        return () => { alive = false; };
    }, [metric]);

    return (
        <div className="leaderboard-backdrop" onClick={onClose} role="dialog" aria-label="Leaderboard">
            <div className="leaderboard-panel" onClick={(e) => e.stopPropagation()}>
                <div className="leaderboard-head">
                    <h3>Season 1 Leaderboard</h3>
                    <button className="leaderboard-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div className="leaderboard-tabs">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            className={`leaderboard-tab${metric === t.key ? ' active' : ''}`}
                            onClick={() => setMetric(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="leaderboard-body">
                    {rows === null && (
                        <div className="leaderboard-skeleton" aria-hidden="true">
                            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="lb-sk-row" />)}
                        </div>
                    )}
                    {rows !== null && error && <p className="leaderboard-note">Leaderboard is warming up — try again in a moment.</p>}
                    {rows !== null && !error && rows.length === 0 && (
                        <p className="leaderboard-note">No ranked players yet — win a match to claim the top spot!</p>
                    )}
                    {rows !== null && rows.length > 0 && (
                        <ol className="leaderboard-list">
                            {rows.map((row, i) => {
                                const isOwn = ownAddress && row.walletAddress?.toLowerCase() === ownAddress.toLowerCase();
                                return (
                                    <li key={row.walletAddress || i} className={`leaderboard-row${isOwn ? ' own' : ''}`}>
                                        <span className="rank">{MEDALS[i] || `#${i + 1}`}</span>
                                        <span className="player">{row.username || shortAddr(row.walletAddress)}{isOwn ? ' (you)' : ''}</span>
                                        <span className="value">{fmtValue(metric, row)}</span>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>

                <p className="leaderboard-footer">XP is Season-1 progression — non-monetary, never redeemable.</p>
            </div>
        </div>
    );
};

export default Leaderboard;
