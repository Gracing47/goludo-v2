/**
 * AdminPage (G-027)
 *
 * Ops-Panel für nicht-technische Betreiber: ein Zugangscode, große Karten,
 * Klartext-Beschriftung (deutsch), Bestätigungsdialoge vor jedem Eingriff.
 * Spricht ausschließlich mit /api/admin/* (fail-closed ohne ADMIN_KEY).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import { weiToGo, shortAddr } from '../utils/format';
import './AdminPage.css';

const KEY_STORAGE = 'goludo_admin_key';

const fmtGo = (wei: unknown): string => weiToGo(wei);
const shortId = (id: string) => (id ? `${id.slice(0, 10)}…` : '—');

type Overview = {
    ok: boolean;
    rooms: any[];
    faucet?: { enabled: boolean; reservoir: string };
    vault?: { address: string; paused: boolean };
    burn?: any;
    chainError?: string;
};

const AdminPage: React.FC = () => {
    const [key, setKey] = useState<string>(() => {
        try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; }
    });
    const [keyInput, setKeyInput] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const [data, setData] = useState<Overview | null>(null);
    const [players, setPlayers] = useState<any[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const api = useCallback(async (path: string, init?: RequestInit) => {
        const res = await fetch(`${API_URL}/api/admin${path}`, {
            ...init,
            headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key, ...(init?.headers || {}) },
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 401) { setAuthError('Falscher Zugangscode.'); setKey(''); try { localStorage.removeItem(KEY_STORAGE); } catch { /* ignore */ } }
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        return json;
    }, [key]);

    const refresh = useCallback(async () => {
        if (!key) return;
        try {
            const [ov, pl] = await Promise.all([api('/overview'), api('/players?metric=totalXp&limit=15')]);
            setData(ov);
            setPlayers(Array.isArray(pl) ? pl : []);
            setAuthError(null);
        } catch (err: any) {
            // Audit N2: 401 is handled inside api() — everything else surfaces here
            if (!String(err.message).includes('access code')) setNotice(err.message);
        }
    }, [key, api]);

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 30000); // Audit N4: 30s is plenty, saves RPC quota
        return () => clearInterval(t);
    }, [refresh]);

    const act = async (label: string, path: string, body?: any, confirmText?: string) => {
        if (confirmText && !window.confirm(confirmText)) return;
        setBusy(path);
        setNotice(null);
        try {
            const r = await api(path, { method: 'POST', body: JSON.stringify(body || {}) });
            setNotice(`✅ ${label} erfolgreich${r.txHash ? ` (Tx ${r.txHash.slice(0, 10)}…)` : ''}.`);
            await refresh();
        } catch (err: any) {
            setNotice(`❌ ${label} fehlgeschlagen: ${err.message}`);
        } finally {
            setBusy(null);
        }
    };

    // ---- Login-Gate ----
    if (!key) {
        return (
            <div className="admin-page">
                <div className="admin-login">
                    <h2>🛡️ GoLudo Verwaltung</h2>
                    <p>Bitte Zugangscode eingeben. Den Code bekommst du vom Team.</p>
                    {authError && <p className="admin-error">{authError}</p>}
                    <input
                        type="password"
                        value={keyInput}
                        placeholder="Zugangscode"
                        onChange={(e) => setKeyInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && keyInput) { setKey(keyInput); try { localStorage.setItem(KEY_STORAGE, keyInput); } catch { /* ignore */ } } }}
                    />
                    <button
                        disabled={!keyInput}
                        onClick={() => { setKey(keyInput); try { localStorage.setItem(KEY_STORAGE, keyInput); } catch { /* ignore */ } }}
                    >
                        Anmelden
                    </button>
                </div>
            </div>
        );
    }

    const rooms = data?.rooms ?? [];
    const waiting = rooms.filter(r => r.status === 'WAITING');
    const active = rooms.filter(r => r.status === 'ACTIVE' || r.status === 'STARTING');

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h2>🛡️ GoLudo Verwaltung</h2>
                <div className="admin-header-actions">
                    <button onClick={refresh}>↻ Aktualisieren</button>
                    <button onClick={() => { setKey(''); try { localStorage.removeItem(KEY_STORAGE); } catch { /* ignore */ } }}>Abmelden</button>
                </div>
            </header>

            {notice && <div className="admin-notice" role="status">{notice}</div>}
            {data?.chainError && <div className="admin-notice warn">⚠️ {data.chainError}</div>}

            {/* Status-Karten */}
            <section className="admin-cards">
                <div className={`admin-card ${data?.vault?.paused ? 'bad' : 'good'}`}>
                    <span className="card-label">Spielbetrieb</span>
                    <span className="card-value">{data ? (data.vault?.paused ? '⏸️ PAUSIERT' : '🟢 Läuft') : '…'}</span>
                </div>
                <div className={`admin-card ${data?.faucet?.enabled ? 'good' : 'bad'}`}>
                    <span className="card-label">Gratis-$GO (Faucet)</span>
                    <span className="card-value">{data ? (data.faucet?.enabled ? '🟢 An' : '🔴 Aus') : '…'}</span>
                    <span className="card-sub">Vorrat: {fmtGo(data?.faucet?.reservoir)} $GO</span>
                </div>
                <div className="admin-card">
                    <span className="card-label">Verbrannte $GO</span>
                    <span className="card-value">🔥 {fmtGo(data?.burn?.totalBurned)}</span>
                    <span className="card-sub">Umlauf: {fmtGo(data?.burn?.circulatingSupply)}</span>
                </div>
                <div className="admin-card">
                    <span className="card-label">Räume</span>
                    <span className="card-value">{active.length} aktiv · {waiting.length} wartend</span>
                </div>
            </section>

            {/* Eingriffe */}
            <section className="admin-panel">
                <h3>Steuerung</h3>
                <div className="admin-controls">
                    <div className="control">
                        <button
                            disabled={busy !== null}
                            onClick={() => act('Faucet umschalten', '/faucet/toggle', {},
                                `Gratis-$GO wirklich ${data?.faucet?.enabled ? 'AUSSCHALTEN' : 'EINSCHALTEN'}?`)}
                        >
                            {data?.faucet?.enabled ? '🔴 Faucet ausschalten' : '🟢 Faucet einschalten'}
                        </button>
                        <p>Schaltet die Gratis-$GO-Ausgabe für Tester an oder aus.</p>
                    </div>
                    <div className="control">
                        <FaucetRefill busy={busy !== null} onRefill={(amt) => act(`Faucet +${amt} $GO`, '/faucet/refill', { amount: amt }, `${amt} $GO in den Faucet-Vorrat legen?`)} />
                        <p>Füllt den Vorrat aus der Betreiber-Wallet nach.</p>
                    </div>
                    <div className="control danger">
                        {data?.vault?.paused ? (
                            <button disabled={busy !== null} onClick={() => act('Spielbetrieb fortsetzen', '/vault/unpause', {}, 'Spielbetrieb wieder freigeben?')}>
                                ▶️ Spielbetrieb fortsetzen
                            </button>
                        ) : (
                            <button disabled={busy !== null} onClick={() => act('NOT-PAUSE', '/vault/pause', {},
                                'NOTBREMSE: Alle neuen Einsätze und Auszahlungen werden gestoppt. Wirklich pausieren?')}>
                                ⛔ Not-Pause (alles stoppen)
                            </button>
                        )}
                        <p>Notbremse bei Problemen: stoppt Einsätze und Auszahlungen im Smart Contract.</p>
                    </div>
                </div>
            </section>

            {/* Räume */}
            <section className="admin-panel">
                <h3>Live-Räume ({rooms.length})</h3>
                {rooms.length === 0 ? <p className="admin-empty">Gerade keine offenen Räume.</p> : (
                    <table className="admin-table">
                        <thead>
                            <tr><th>Raum</th><th>Status</th><th>Einsatz</th><th>Spieler</th><th>Alter</th><th></th></tr>
                        </thead>
                        <tbody>
                            {rooms.map(r => (
                                <tr key={r.id}>
                                    <td title={r.id}>{shortId(r.id)}</td>
                                    <td>{r.status}{r.gamePhase ? ` · ${r.gamePhase}` : ''}</td>
                                    <td>{r.stake} $GO</td>
                                    <td>{r.players.map((p: any) => `${p.name}${p.connected ? '' : ' (offline)'}`).join(', ') || '—'}</td>
                                    <td>{r.ageMinutes} min</td>
                                    <td>
                                        <button
                                            className="table-btn"
                                            disabled={busy !== null}
                                            onClick={() => act('Raum entfernen', '/rooms/remove', { roomId: r.id },
                                                'Raum aus der Lobby entfernen? Einsätze auf der Blockchain bleiben unberührt (Rückzahlung läuft über Cancel & Refund im Spiel).')}
                                        >
                                            🧹 Entfernen
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {/* Spieler */}
            <section className="admin-panel">
                <h3>Top-Spieler (XP)</h3>
                {!players ? <p className="admin-empty">Lade…</p> : players.length === 0 ? <p className="admin-empty">Noch keine Spieler.</p> : (
                    <table className="admin-table">
                        <thead>
                            <tr><th>#</th><th>Spieler</th><th>XP</th><th>Siege</th><th>$GO gewonnen</th></tr>
                        </thead>
                        <tbody>
                            {players.map((p, i) => (
                                <tr key={p.walletAddress}>
                                    <td>{i + 1}</td>
                                    <td title={p.walletAddress}>{p.username || shortAddr(p.walletAddress)}</td>
                                    <td>{p.totalXp}</td>
                                    <td>{p.totalWins}</td>
                                    <td>{fmtGo(p.totalWon)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <p className="admin-footer">Testnet-Betrieb · Alle Aktionen werden im Server-Log protokolliert.</p>
        </div>
    );
};

// Kleine Unterkomponente: Betrag + Button für den Faucet-Refill
const FaucetRefill: React.FC<{ busy: boolean; onRefill: (amt: string) => void }> = ({ busy, onRefill }) => {
    const [amt, setAmt] = useState('1000');
    const valid = /^\d+(\.\d+)?$/.test(amt) && parseFloat(amt) > 0;
    return (
        <div className="refill-row">
            <input type="number" min="1" value={amt} onChange={(e) => setAmt(e.target.value)} aria-label="Betrag in $GO" />
            <button disabled={busy || !valid} onClick={() => onRefill(amt)}>💧 Faucet nachfüllen</button>
        </div>
    );
};

export default AdminPage;
