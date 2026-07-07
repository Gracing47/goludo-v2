/**
 * UsernameOnboard (G-028/G-033) — first-time name prompt.
 *
 * When a connected wallet has no username yet (and hasn't dismissed this),
 * a friendly one-time modal invites the player to pick a leaderboard name.
 * Uses the replay-safe signAction flow (G-032). Fully skippable.
 */
import React, { useEffect, useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { API_URL } from '../config/api';
import { signAction } from '../utils/signAction';
import { avatarUrl } from '../utils/avatar';
import { showToast } from '../services/toast';
import './UsernameOnboard.css';

const DISMISS_KEY = 'goludo_username_onboard_done';

const UsernameOnboard = () => {
    const account = useActiveAccount();
    const [show, setShow] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!account?.address) return;
        let alive = true;
        (async () => {
            try {
                if (localStorage.getItem(DISMISS_KEY) === account.address.toLowerCase()) return;
                const res = await fetch(`${API_URL}/api/profile/${account.address}`);
                if (!res.ok) return;
                const data = await res.json();
                if (alive && !data?.profile?.username) setShow(true);
            } catch { /* offline — skip */ }
        })();
        return () => { alive = false; };
    }, [account?.address]);

    const done = () => {
        try { localStorage.setItem(DISMISS_KEY, account?.address?.toLowerCase() || '1'); } catch { /* ignore */ }
        setShow(false);
    };

    const save = async () => {
        const n = name.trim();
        if (!/^[a-zA-Z0-9_]{3,16}$/.test(n)) {
            showToast('3–16 characters: letters, numbers, underscore.', 'error');
            return;
        }
        setSaving(true);
        try {
            const signed = await signAction(account, 'set-username', n);
            const res = await fetch(`${API_URL}/api/profile/username`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: n, ...signed }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
            showToast(`👋 Welcome, ${n}!`, 'success');
            done();
        } catch (err) {
            showToast(`Could not set name: ${err.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!show || !account?.address) return null;

    return (
        <div className="uno-backdrop" onClick={done}>
            <div className="uno-card" onClick={(e) => e.stopPropagation()}>
                <img className="uno-avatar" src={avatarUrl(account.address, 72)} alt="" />
                <h3>Pick your player name</h3>
                <p>This is how you'll show up on the leaderboard and to opponents. You can change it later in your profile.</p>
                <input
                    value={name}
                    maxLength={16}
                    placeholder="e.g. DiceKing"
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !saving) save(); }}
                    autoFocus
                />
                <div className="uno-actions">
                    <button className="uno-skip" onClick={done} disabled={saving}>Skip for now</button>
                    <button className="uno-save" onClick={save} disabled={saving || name.trim().length < 3}>
                        {saving ? 'Saving…' : 'Save name'}
                    </button>
                </div>
                <span className="uno-note">One signature confirms it's your wallet — no gas, no cost.</span>
            </div>
        </div>
    );
};

export default UsernameOnboard;
