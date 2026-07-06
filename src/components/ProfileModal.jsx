/**
 * ProfileModal (G-023 · UI/UX 2026 wave)
 *
 * Player profile overlay: Season-1 XP progression, per-mode stats, streaks
 * and recent match history. Reads `/api/profile/:address` (G-018 backend).
 *
 * 2026 UX notes applied here:
 * - progression as the retention core (level ring + XP bar, quick early levels)
 * - skeleton loading instead of spinners
 * - graceful empty state with a clear next action
 */
import React, { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import { STAKE_CURRENCY_SYMBOL } from '../config/currency';
import { weiToGo, shortAddr } from '../utils/format';
import './ProfileModal.css';

// Season-1 DISPLAY curve (client-only, non-monetary): 500 XP per level.
// Early levels come fast on purpose — "a new user can climb quickly".
const XP_PER_LEVEL = 500;
const levelFromXp = (xp) => Math.floor((xp ?? 0) / XP_PER_LEVEL) + 1;
const levelProgress = (xp) => ((xp ?? 0) % XP_PER_LEVEL) / XP_PER_LEVEL;

const fmtDuration = (s) => {
    if (!s && s !== 0) return '—';
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};

const ProfileModal = ({ onClose, address }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!address) return;
        let alive = true;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/profile/${address}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (alive) setData(json);
            } catch {
                if (alive) setError(true);
            }
        })();
        return () => { alive = false; };
    }, [address]);

    const p = data?.profile;
    const xp = p?.totalXp ?? 0;
    const level = levelFromXp(xp);
    const progress = levelProgress(xp);
    const games = data?.recentGames ?? [];
    const hasPlayed = (p?.totalGamesPlayed ?? 0) > 0 || games.length > 0;

    return (
        <div className="profile-backdrop" onClick={onClose} role="dialog" aria-label="Player profile">
            <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
                <div className="profile-head">
                    <h3>Player Profile</h3>
                    <button className="profile-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                {/* Loading skeleton (2026: no naked spinners) */}
                {!data && !error && (
                    <div className="profile-skeleton" aria-hidden="true">
                        <div className="sk sk-avatar" />
                        <div className="sk sk-line w60" />
                        <div className="sk sk-line w40" />
                        <div className="sk-grid">
                            <div className="sk sk-card" /><div className="sk sk-card" />
                            <div className="sk sk-card" /><div className="sk sk-card" />
                        </div>
                    </div>
                )}

                {error && (
                    <p className="profile-note">Profile is warming up — try again in a moment.</p>
                )}

                {data && (
                    <div className="profile-body">
                        {/* Identity + progression */}
                        <div className="profile-identity">
                            <div className="profile-avatar" style={{ '--ring': `${progress * 360}deg` }}>
                                <span className="profile-level">Lv {level}</span>
                            </div>
                            <div className="profile-who">
                                <strong>{p?.username || shortAddr(address)}</strong>
                                <span className="profile-addr">{shortAddr(address)}</span>
                            </div>
                        </div>

                        <div className="xp-bar" title={`${xp % XP_PER_LEVEL} / ${XP_PER_LEVEL} XP to level ${level + 1}`}>
                            <div className="xp-fill" style={{ width: `${Math.max(2, progress * 100)}%` }} />
                            <span className="xp-label">⭐ {xp.toLocaleString()} XP</span>
                        </div>

                        {!hasPlayed ? (
                            <div className="profile-empty">
                                <p>No matches yet — your legend starts with one roll. 🎲</p>
                                <p className="profile-empty-hint">Play free vs the AI, or grab $GO from the faucet and stake a Web3 match.</p>
                            </div>
                        ) : (
                            <>
                                {/* Core stats */}
                                <div className="profile-grid">
                                    <div className="stat-card"><span className="stat-value">{data.winRate}%</span><span className="stat-label">Win rate</span></div>
                                    <div className="stat-card"><span className="stat-value">{p?.totalWins ?? 0}</span><span className="stat-label">Wins</span></div>
                                    <div className="stat-card"><span className="stat-value">🔥 {p?.bestStreak ?? 0}</span><span className="stat-label">Best streak</span></div>
                                    <div className="stat-card"><span className="stat-value">{weiToGo(p?.totalWon)}</span><span className="stat-label">${STAKE_CURRENCY_SYMBOL} won</span></div>
                                </div>

                                {/* Per-mode chips */}
                                <div className="mode-chips">
                                    <span className="mode-chip">🎲 Classic · {p?.classicWins ?? 0}W ({data.classicWinRate}%){p?.classicBestTime ? ` · best ${fmtDuration(p.classicBestTime)}` : ''}</span>
                                    <span className="mode-chip">⚡ Rapid · {p?.rapidWins ?? 0}W ({data.rapidWinRate}%){p?.rapidBestTime ? ` · best ${fmtDuration(p.rapidBestTime)}` : ''}</span>
                                </div>

                                {/* Recent matches */}
                                {games.length > 0 && (
                                    <div className="profile-history">
                                        <p className="history-title">Recent matches</p>
                                        <ul>
                                            {games.slice(0, 6).map((g, i) => {
                                                const won = g.winner?.toLowerCase() === address?.toLowerCase();
                                                return (
                                                    <li key={g.roomId || i} className={won ? 'won' : 'lost'}>
                                                        <span className="hist-result">{won ? 'W' : 'L'}</span>
                                                        <span className="hist-mode">{g.mode === 'rapid' ? '⚡' : '🎲'}</span>
                                                        <span className="hist-stake">{weiToGo(g.betAmount)} ${STAKE_CURRENCY_SYMBOL}</span>
                                                        <span className="hist-time">{fmtDuration(g.duration)}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}

                        <p className="profile-footer">Season-1 XP is non-monetary progression — never redeemable.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileModal;
