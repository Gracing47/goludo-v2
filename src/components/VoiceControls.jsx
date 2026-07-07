/**
 * VoiceControls (G-029) — voice UI for a web3/PvP match.
 *
 * Renders nothing outside a 2-player web3 match. Shows a single opt-in button;
 * once enabled, mic-mute + mute-opponent controls appear. All wiring lives in
 * useVoiceChat; this is presentation + the permission explainer.
 */
import React from 'react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import './VoiceControls.css';

const MicIcon = ({ muted }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

    const statusLabel = {
        off: '', connecting: 'Starting…', waiting: 'Waiting for opponent…', live: 'Voice live', error: '',
    }[status];

    return (
        <div className="voice-controls" role="group" aria-label="Voice chat">
            {status === 'off' || status === 'error' ? (
                <>
                    <button className="voice-btn enable" onClick={enableVoice} title="Talk to your opponent (asks for microphone)">
                        <MicIcon /> <span>Voice chat</span>
                    </button>
                    {error && <span className="voice-error">{error}</span>}
                    {status === 'off' && <span className="voice-hint">Both players must enable it · opponent sees your IP (P2P)</span>}
                </>
            ) : (
                <>
                    {/* Push-to-talk: hold to speak (mic muted otherwise). Works for
                        mouse + touch; releasing/leaving always re-mutes. */}
                    <button
                        className={`voice-btn ptt ${!micMuted ? 'talking' : ''}`}
                        onPointerDown={() => { if (micMuted) toggleMic(); }}
                        onPointerUp={() => { if (!micMuted) toggleMic(); }}
                        onPointerLeave={() => { if (!micMuted) toggleMic(); }}
                        onContextMenu={(e) => e.preventDefault()}
                        title="Hold to talk"
                    >
                        <MicIcon muted={micMuted} /> <span>{micMuted ? 'Hold to talk' : 'Talking…'}</span>
                    </button>
                    <button className={`voice-btn mic ${micMuted ? 'muted' : ''}`} onClick={toggleMic} title={micMuted ? 'Open mic (hands-free)' : 'Mute mic'}>
                        {micMuted ? '🔇' : '🎙️'}
                    </button>
                    <button className={`voice-btn remote ${remoteMuted ? 'muted' : ''}`} onClick={toggleRemote} title={remoteMuted ? 'Unmute opponent' : 'Mute opponent'}>
                        {remoteMuted ? '🔇' : '🔊'}
                    </button>
                    <span className={`voice-status ${status}`}>{statusLabel}</span>
                    <button className="voice-btn leave" onClick={disableVoice} title="Turn off voice">✕</button>
                </>
            )}
        </div>
    );
};

export default VoiceControls;
