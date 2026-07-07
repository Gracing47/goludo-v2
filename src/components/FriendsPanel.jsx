/**
 * FriendsPanel (G-030) — add / manage friends, see who's online, challenge them.
 *
 * All mutations use the replay-safe signAction flow (G-032). Presence + names
 * come from the backend; avatars are the deterministic DiceBear seed (DRY).
 * Challenge reuses the existing invite-link flow (G-011).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { API_URL } from '../config/api';
import { signAction } from '../utils/signAction';
import { avatarUrl } from '../utils/avatar';
import { shortAddr } from '../utils/format';
import { showToast } from '../services/toast';
import './FriendsPanel.css';

// One signed session per wallet unlocks reads for 30 min (Daniel B1) — cached
// so opening the panel again doesn't re-prompt.
const SESSION_KEY = 'goludo_friend_session';
function cachedSession(addr) {
    try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (s && s.address === addr.toLowerCase() && s.expires > Date.now()) return s.token;
    } catch { /* ignore */ }
    return null;
}

const FriendsPanel = ({ onClose, onChallenge }) => {
    const account = useActiveAccount();
    const [data, setData] = useState(null);
    const [addInput, setAddInput] = useState('');
    const [busy, setBusy] = useState('');
    const [token, setToken] = useState(() => (account?.address ? cachedSession(account.address) : null));
    const [needSignIn, setNeedSignIn] = useState(false);

    const ensureSession = useCallback(async () => {
        if (!account?.address) return null;
        const cached = cachedSession(account.address);
        if (cached) { setToken(cached); return cached; }
        // One signature → session token.
        const signed = await signAction(account, 'friend-session', account.address);
        const res = await fetch(`${API_URL}/api/friends/session`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: account.address, ...signed }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Sign-in failed');
        try { localStorage.setItem(SESSION_KEY, JSON.stringify({ address: account.address.toLowerCase(), token: json.token, expires: json.expires })); } catch { /* ignore */ }
        setToken(json.token);
        return json.token;
    }, [account]);

    const load = useCallback(async (tok) => {
        if (!account?.address) return;
        const t = tok || token || cachedSession(account.address);
        if (!t) { setNeedSignIn(true); return; }
        try {
            const res = await fetch(`${API_URL}/api/friends/${account.address}`, { headers: { 'X-Friend-Token': t } });
            if (res.status === 401) { setNeedSignIn(true); setToken(null); return; }
            if (res.ok) { setData(await res.json()); setNeedSignIn(false); }
        } catch { /* offline */ }
    }, [account?.address, token]);

    useEffect(() => {
        (async () => {
            try {
                const t = await ensureSession();
                if (t) await load(t);
            } catch { setNeedSignIn(true); }
        })();
        const iv = setInterval(() => load(), 20000);
        return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account?.address]);

    const act = async (action, target, extra = {}, label = 'Done') => {
        if (!account?.address) return;
        setBusy(`${action}:${target}`);
        try {
            const signed = await signAction(account, `friend-${action}`, target);
            const res = await fetch(`${API_URL}/api/friends/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target, ...signed, ...extra }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
            showToast(`✅ ${label}`, 'success');
            setAddInput('');
            await load();
        } catch (err) {
            showToast(err.message || 'Failed', 'error');
        } finally {
            setBusy('');
        }
    };

    const Row = ({ p, children }) => (
        <li className="fr-row">
            <img className="fr-avatar" src={avatarUrl(p.address, 32)} alt="" loading="lazy" />
            <span className="fr-name">
                {p.username || shortAddr(p.address)}
                {p.online && <span className="fr-online" title="Online" />}
            </span>
            <span className="fr-actions">{children}</span>
        </li>
    );

    const busyOn = (a, t) => busy === `${a}:${t}`;

    return (
        <div className="fr-backdrop" onClick={onClose} role="dialog" aria-label="Friends">
            <div className="fr-panel" onClick={(e) => e.stopPropagation()}>
                <div className="fr-head">
                    <h3>Friends</h3>
                    <button className="fr-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                {/* Add by name or address */}
                <div className="fr-add">
                    <input
                        value={addInput}
                        placeholder="Add by name or 0x…"
                        onChange={(e) => setAddInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && addInput.trim()) act('request', addInput.trim(), {}, 'Request sent'); }}
                    />
                    <button disabled={!addInput.trim() || busy} onClick={() => act('request', addInput.trim(), {}, 'Request sent')}>
                        Add
                    </button>
                </div>

                {needSignIn ? (
                    <div className="fr-signin">
                        <p className="fr-note">Sign once to open your private friends list (free, no gas).</p>
                        <button className="fr-signin-btn" onClick={async () => { try { const t = await ensureSession(); await load(t); } catch { /* toast handled */ } }}>
                            Sign in
                        </button>
                    </div>
                ) : !data ? <p className="fr-note">Loading…</p> : (
                    <div className="fr-body">
                        {data.incoming.length > 0 && (
                            <section>
                                <p className="fr-label">Requests</p>
                                <ul>
                                    {data.incoming.map(p => (
                                        <Row key={p.address} p={p}>
                                            <button className="fr-btn ok" disabled={busy} onClick={() => act('respond', p.address, { accept: true }, 'Friend added')}>Accept</button>
                                            <button className="fr-btn" disabled={busy} onClick={() => act('respond', p.address, { accept: false }, 'Declined')}>✕</button>
                                        </Row>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <section>
                            <p className="fr-label">Friends ({data.friends.length})</p>
                            {data.friends.length === 0 ? <p className="fr-note">No friends yet — add someone by their name.</p> : (
                                <ul>
                                    {data.friends.map(p => (
                                        <Row key={p.address} p={p}>
                                            <button className="fr-btn ok" disabled={busy} onClick={() => onChallenge?.(p)} title="Challenge to a match">⚔️</button>
                                            <button className="fr-btn" disabled={busyOn('remove', p.address)} onClick={() => act('remove', p.address, {}, 'Removed')} title="Remove">🗑️</button>
                                            <button className="fr-btn danger" disabled={busyOn('block', p.address)} onClick={() => act('block', p.address, {}, 'Blocked')} title="Block">🚫</button>
                                        </Row>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {data.outgoing.length > 0 && (
                            <section>
                                <p className="fr-label">Pending</p>
                                <ul>
                                    {data.outgoing.map(p => (
                                        <Row key={p.address} p={p}>
                                            <span className="fr-pending">Sent…</span>
                                            <button className="fr-btn" disabled={busy} onClick={() => act('remove', p.address, {}, 'Cancelled')} title="Cancel">✕</button>
                                        </Row>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                )}
                <p className="fr-foot">Adding, accepting and blocking each need one free wallet signature.</p>
            </div>
        </div>
    );
};

export default FriendsPanel;
