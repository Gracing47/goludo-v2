/**
 * useVoiceChat (G-029) — opt-in P2P voice for a 2-player match.
 *
 * WebRTC audio, signaled over the existing game socket (room-scoped relay).
 * Design constraints from Daniel's ticket review:
 *  - BOTH players must enable voice before any audio flows (no one-sided listen).
 *  - Remote audio only plays after a user gesture (iOS autoplay unlock) — the
 *    enable button IS that gesture.
 *  - "Perfect negotiation" so reconnects renegotiate without glare; the room
 *    creator is the polite peer (deterministic role).
 *  - On disable / unmount / peer-leave: every track stopped, pc closed — the
 *    browser mic indicator must go OFF.
 *  - Local mute toggles the mic track; remote mute gates the <audio> element.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

type VoiceStatus = 'off' | 'connecting' | 'waiting' | 'live' | 'error';

interface Params {
    socket: Socket | null;
    roomId: string | null;
    isPolite: boolean; // room creator = polite peer (deterministic)
    enabled: boolean;  // parent only mounts voice for web3/PvP matches
}

export function useVoiceChat({ socket, roomId, isPolite, enabled }: Params) {
    const [status, setStatus] = useState<VoiceStatus>('off');
    const [micMuted, setMicMuted] = useState(false);
    const [remoteMuted, setRemoteMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);
    const makingOfferRef = useRef(false);
    const activeRef = useRef(false); // did WE opt in?

    // ---- teardown: stop every track, close pc, drop audio ----
    const teardown = useCallback((tellPeer: boolean) => {
        activeRef.current = false;
        if (tellPeer && socket && roomId) socket.emit('voice_end', { roomId });
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop()); // mic indicator OFF
            localStreamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.ontrack = null;
            pcRef.current.onicecandidate = null;
            pcRef.current.onnegotiationneeded = null;
            pcRef.current.close();
            pcRef.current = null;
        }
        if (audioElRef.current) {
            audioElRef.current.srcObject = null;
        }
        makingOfferRef.current = false;
        setStatus('off');
        setRemoteMuted(false);
        setMicMuted(false);
    }, [socket, roomId]);

    const createPeer = useCallback(() => {
        const pc = new RTCPeerConnection({ iceServers: STUN });

        pc.onicecandidate = (e) => {
            if (e.candidate && socket && roomId) socket.emit('voice_ice', { roomId, candidate: e.candidate });
        };
        pc.ontrack = (e) => {
            // Attach the remote stream; the <audio> element was created after a
            // user gesture, so playback is allowed (iOS-safe).
            if (audioElRef.current && e.streams[0]) {
                audioElRef.current.srcObject = e.streams[0];
                audioElRef.current.play().catch(() => { /* gesture already satisfied; ignore */ });
            }
            setStatus('live');
        };
        pc.onnegotiationneeded = async () => {
            try {
                makingOfferRef.current = true;
                await pc.setLocalDescription();
                if (socket && roomId) socket.emit('voice_offer', { roomId, description: pc.localDescription });
            } catch { /* handled by perfect-negotiation rollback */ }
            finally { makingOfferRef.current = false; }
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                if (activeRef.current) setStatus('waiting');
            }
        };
        pcRef.current = pc;
        return pc;
    }, [socket, roomId]);

    // ---- user enables voice (this is the iOS autoplay-unlock gesture) ----
    const enableVoice = useCallback(async () => {
        if (!socket || !roomId || activeRef.current) return;
        setError(null);
        setStatus('connecting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            activeRef.current = true;

            // Pre-create the audio sink now, inside the gesture, so remote
            // playback is permitted later on iOS Safari.
            if (!audioElRef.current) {
                const el = document.createElement('audio');
                el.autoplay = true;
                (el as any).playsInline = true;
                audioElRef.current = el;
            }

            const pc = createPeer();
            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            setStatus('waiting');
            socket.emit('voice_ready', { roomId }); // tell peer we're in
        } catch (err: any) {
            activeRef.current = false;
            setStatus('error');
            setError(err?.name === 'NotAllowedError'
                ? 'Microphone blocked — allow it in your browser settings to use voice.'
                : 'Could not start voice.');
        }
    }, [socket, roomId, createPeer]);

    const disableVoice = useCallback(() => teardown(true), [teardown]);

    const toggleMic = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setMicMuted(!track.enabled);
    }, []);

    const toggleRemote = useCallback(() => {
        setRemoteMuted(m => {
            const next = !m;
            if (audioElRef.current) audioElRef.current.muted = next;
            return next;
        });
    }, []);

    // ---- signaling ----
    useEffect(() => {
        if (!socket || !roomId) return;

        const onPeerReady = async () => {
            // Both sides opted in. The IMPOLITE peer kicks off the offer so we
            // don't double-offer; addTrack already queued negotiationneeded.
            if (activeRef.current && !isPolite && pcRef.current && pcRef.current.signalingState === 'stable') {
                try {
                    makingOfferRef.current = true;
                    await pcRef.current.setLocalDescription();
                    socket.emit('voice_offer', { roomId, description: pcRef.current.localDescription });
                } catch { /* ignore */ } finally { makingOfferRef.current = false; }
            }
        };

        const onOffer = async ({ description }: any) => {
            if (!activeRef.current) return; // we haven't opted in → ignore, no audio
            const pc = pcRef.current ?? createPeer();
            const offerCollision = description.type === 'offer' &&
                (makingOfferRef.current || pc.signalingState !== 'stable');
            if (offerCollision && !isPolite) return; // impolite peer ignores colliding offer
            try {
                await pc.setRemoteDescription(description);
                if (description.type === 'offer') {
                    // ensure our mic is attached before answering
                    if (localStreamRef.current && pc.getSenders().length === 0) {
                        localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
                    }
                    await pc.setLocalDescription();
                    socket.emit('voice_answer', { roomId, description: pc.localDescription });
                }
            } catch { /* ignore */ }
        };

        const onAnswer = async ({ description }: any) => {
            if (pcRef.current && description.type === 'answer') {
                try { await pcRef.current.setRemoteDescription(description); } catch { /* ignore */ }
            }
        };

        const onIce = async ({ candidate }: any) => {
            if (pcRef.current && candidate) {
                try { await pcRef.current.addIceCandidate(candidate); } catch { /* ignore */ }
            }
        };

        const onPeerEnd = () => {
            // Peer disabled voice or left — tear our side down but stay ready to
            // re-enable. Do NOT tell the peer back (avoid ping-pong).
            if (activeRef.current) {
                teardown(false);
                setStatus('off');
            }
        };

        socket.on('voice_ready', onPeerReady);
        socket.on('voice_offer', onOffer);
        socket.on('voice_answer', onAnswer);
        socket.on('voice_ice', onIce);
        socket.on('voice_end', onPeerEnd);
        return () => {
            socket.off('voice_ready', onPeerReady);
            socket.off('voice_offer', onOffer);
            socket.off('voice_answer', onAnswer);
            socket.off('voice_ice', onIce);
            socket.off('voice_end', onPeerEnd);
        };
    }, [socket, roomId, isPolite, createPeer, teardown]);

    // Cleanup on unmount / when the feature is disabled by the parent
    useEffect(() => {
        if (!enabled) teardown(true);
        return () => teardown(true);
    }, [enabled, teardown]);

    return { status, micMuted, remoteMuted, error, enableVoice, disableVoice, toggleMic, toggleRemote, active: activeRef.current };
}
