/**
 * VoiceControls (G-029) — compact AAA voice widget, bottom-RIGHT so it never
 * covers the dice. Collapsed = one small round mic FAB; enabled = a tidy
 * vertical stack of round buttons (push-to-talk, hands-free, mute opponent,
 * leave). All wiring lives in useVoiceChat.
 */
import React from 'react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import './VoiceControls.css';

const MicIcon = ({ muted, size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        {muted && <line x1="3" y1="3" x2="21" y2="21" stroke="#ff6b6b" />}
    </svg>
);

const VoiceControls = ({ socket, roomId, isPolite, enabled }) => {
    const { status, micMuted, remoteMuted, error, enableVoice, disableVoice, toggleMic, toggleRemote } =
        useVoiceChat({ socket, roomId, isPolite, enabled });

    if (!enabled) return null;

    // Collapsed: single mic FAB that requests permission on tap.
    if (status === 'off' || status === 'error') {
        return (
            <div className="voice-fab-wrap">
                <button className="voice-fab" onClick={enableVoice} title="Talk to your opponent (asks for microphone · both must enable · opponent sees your IP)">
                    <MicIcon size={20} />
                </button>
                {error && <span className="voice-fab-error">{error}</span>}
            </div>
        );
    }

    const dotClass = status === 'live' ? 'live' : status === 'waiting' ? 'waiting' : 'connecting';

    return (
        <div className="voice-stack" role="group" aria-label="Voice chat">
            <span className={`voice-dot ${dotClass}`} title={status === 'live' ? 'Voice live' : status === 'waiting' ? 'Waiting for opponent…' : 'Connecting…'} />

            {/* Push-to-talk: hold to speak; hands-free toggle is the mic button below */}
            <button
                className={`voice-round ptt ${!micMuted ? 'talking' : ''}`}
                onPointerDown={() => { if (micMuted) toggleMic(); }}
                onPointerUp={() => { if (!micMuted) toggleMic(); }}
                onPointerLeave={() => { if (!micMuted) toggleMic(); }}
                onContextMenu={(e) => e.preventDefault()}
                title="Hold to talk"
            >
                <MicIcon size={18} />
            </button>

            <button className={`voice-round small ${micMuted ? '' : 'on'}`} onClick={toggleMic} title={micMuted ? 'Hands-free (open mic)' : 'Back to push-to-talk'}>
                {micMuted ? '🎙️' : '🔴'}
            </button>
            <button className={`voice-round small ${remoteMuted ? 'muted' : ''}`} onClick={toggleRemote} title={remoteMuted ? 'Unmute opponent' : 'Mute opponent'}>
                {remoteMuted ? '🔇' : '🔊'}
            </button>
            <button className="voice-round small leave" onClick={disableVoice} title="Turn off voice">✕</button>
        </div>
    );
};

export default VoiceControls;
