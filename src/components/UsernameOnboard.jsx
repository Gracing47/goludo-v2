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

const UsernameOnboard = () => {
    const account = useActiveAccount();
    const [show, setShow] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [inlineError, setInlineError] = useState('');

    useEffect(() => {
        if (!account?.address) return;
        let alive = true;
        (async () => {
            try {
                // Mandatory: prompt whenever a connected wallet has no name yet.
                const res = await fetch(`${API_URL}/api/profile/${account.address}`);
                if (!res.ok) return;
                const data = await res.json();
                if (alive && !data?.profile?.username) setShow(true);
                else if (alive) setShow(false);
            } catch { /* offline — skip */ }
        })();
        return () => { alive = false; };
    }, [account?.address]);

    const save = async () => {
        const n = name.trim();
        setInlineError('');
        if (!/^[a-zA-Z0-9_]{3,16}$/.test(n)) {
            setInlineError('3–16 characters: letters, numbers, underscore.');
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
            if (res.status === 409) { setInlineError('That name is already taken — pick another.'); return; }
            if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
            showToast(`👋 Welcome, ${n}!`, 'success');
            setShow(false); // only closes on a successful, unique name — mandatory
        } catch (err) {
            setInlineError(err.message || 'Could not set name.');
        } finally {
            setSaving(false);
        }
    };

    if (!show || !account?.address) return null;

    return (
        <div className="uno-backdrop">
            <div className="uno-card">
                <img className="uno-avatar" src={avatarUrl(account.address, 72)} alt="" />
                <h3>Choose your player name</h3>
                <p>Required to play — this is your unique name on the leaderboard and to opponents. You can change it later in your profile.</p>
                <input
                    value={name}
                    maxLength={16}
                    placeholder="e.g. DiceKing"
                    onChange={(e) => { setName(e.target.value); setInlineError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !saving) save(); }}
                    autoFocus
                />
                {inlineError && <span className="uno-inline-error">{inlineError}</span>}
                <div className="uno-actions">
                    <button className="uno-save full" onClick={save} disabled={saving || name.trim().length < 3}>
                        {saving ? 'Saving…' : 'Save name'}
                    </button>
                </div>
                <span className="uno-note">One signature confirms it's your wallet — no gas, no cost.</span>
            </div>
        </div>
    );
};

export default UsernameOnboard;
