/**
 * VoiceControls (G-029) — standalone PUSH-TO-TALK button.
 *
 * Design (Tommy): voice is NEVER open the whole time. One self-contained mic
 * button on the left edge, clear of the top gear and bottom burger:
 *   - Not enabled → tap to grant mic (permission prompt) + connect.
 *   - Enabled     → HOLD to talk (mic opens only while held), release = muted.
 *   - Small ✕ to turn voice off, small 🔊/🔇 to mute the opponent.
 * Mic is muted at all times except while actively held — no hot-mic.
 */
import React from 'react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import './VoiceControls.css';

const MicIcon = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
);

const VoiceControls = ({ socket, roomId, isPolite, enabled }) => {
    const { status, micMuted, remoteMuted, error, enableVoice, disableVoice, toggleMic, toggleRemote } =
        useVoiceChat({ socket, roomId, isPolite, enabled });

    if (!enabled) return null;

    // Not yet enabled → a single tap requests the mic + connects.
    if (status === 'off' || status === 'error') {
        return (
            <div className="ptt-wrap">
                <button className="ptt-btn idle" onClick={enableVoice} aria-label="Enable voice chat">
                    <MicIcon />
                </button>
                <span className="ptt-caption">{error ? '⚠️' : 'Tap for voice'}</span>
                {error && <span className="ptt-error">{error}</span>}
            </div>
        );
    }

    const talking = !micMuted;
    // Once enabled: hold the button to talk. Pointer events cover mouse + touch.
    const hold = () => { if (micMuted) toggleMic(); };
    const release = () => { if (!micMuted) toggleMic(); };

    return (
        <div className="ptt-wrap">
            <div className="ptt-side">
                <span className={`ptt-dot ${status}`} title={status === 'live' ? 'Connected' : status === 'waiting' ? 'Waiting for opponent…' : 'Connecting…'} />
                <button className={`ptt-mini ${remoteMuted ? 'muted' : ''}`} onClick={toggleRemote} title={remoteMuted ? 'Unmute opponent' : 'Mute opponent'}>
                    {remoteMuted ? '🔇' : '🔊'}
                </button>
                <button className="ptt-mini leave" onClick={disableVoice} title="Turn off voice">✕</button>
            </div>
            <button
                className={`ptt-btn ${talking ? 'talking' : 'ready'}`}
                onPointerDown={hold}
                onPointerUp={release}
                onPointerLeave={release}
                onPointerCancel={release}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="Hold to talk"
            >
                <MicIcon size={26} />
                <span className="ptt-ring" aria-hidden="true" />
            </button>
            <span className="ptt-caption">{talking ? 'Talking…' : 'Hold to talk'}</span>
        </div>
    );
};

export default VoiceControls;
