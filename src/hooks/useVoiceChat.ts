/**
 * useVoiceChat (G-029) — opt-in P2P voice for a 2-player match.
 *
 * WebRTC audio, signaled over the existing game socket (room-scoped relay).
 * Design constraints from Daniel's ticket review + review round 2:
 *  - BOTH players must enable before any audio flows (no one-sided listen).
 *  - Remote audio plays only after a user gesture (iOS unlock) — the enable
 *    button IS that gesture — and the <audio> sink is attached to the DOM
 *    (detached elements are silent on iOS Safari). [Daniel B2]
 *  - ONE deterministic offer trigger: the impolite peer offers once it knows
 *    the peer is ready (peerReadyRef), never double-offers. [Daniel W3]
 *  - Teardown uses refs only, so a socket/room reference change never tears
 *    down a live session. [Daniel B3]
 *  - On disable / unmount / peer-leave: every track stopped, pc closed,
 *    <audio> removed — browser mic indicator goes OFF.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

type VoiceStatus = 'off' | 'connecting' | 'waiting' | 'live' | 'error';

interface Params {
    socket: Socket | null;
    roomId: string | null;
    isPolite: boolean;
    enabled: boolean;
}

export function useVoiceChat({ socket, roomId, isPolite, enabled }: Params) {
    const [status, setStatus] = useState<VoiceStatus>('off');
    const [micMuted, setMicMuted] = useState(false);
    const [remoteMuted, setRemoteMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Latest socket/roomId/isPolite via refs so callbacks stay stable (B3).
    const socketRef = useRef(socket); socketRef.current = socket;
    const roomIdRef = useRef(roomId); roomIdRef.current = roomId;
    const politeRef = useRef(isPolite); politeRef.current = isPolite;

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);
    const makingOfferRef = useRef(false);
    const activeRef = useRef(false);
    const peerReadyRef = useRef(false);

    const emit = (event: string, extra: any = {}) => {
        const s = socketRef.current, r = roomIdRef.current;
        if (s && r) s.emit(event, { roomId: r, ...extra });
    };

    const teardown = useCallback((tellPeer: boolean) => {
        const wasActive = activeRef.current;
        activeRef.current = false;
        peerReadyRef.current = false;
        if (tellPeer && wasActive) emit('voice_end');
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop()); // mic indicator OFF
            localStreamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.ontrack = null;
            pcRef.current.onicecandidate = null;
            pcRef.current.onnegotiationneeded = null;
            pcRef.current.onconnectionstatechange = null;
            pcRef.current.close();
            pcRef.current = null;
        }
        if (audioElRef.current) {
            audioElRef.current.srcObject = null;
            audioElRef.current.remove(); // B2: drop the DOM sink
            audioElRef.current = null;
        }
        makingOfferRef.current = false;
        setStatus('off');
        setRemoteMuted(false);
        setMicMuted(false);
    }, []);

    const createPeer = useCallback(() => {
        const pc = new RTCPeerConnection({ iceServers: STUN });
        pc.onicecandidate = (e) => { if (e.candidate) emit('voice_ice', { candidate: e.candidate }); };
        pc.ontrack = (e) => {
            if (audioElRef.current && e.streams[0]) {
                audioElRef.current.srcObject = e.streams[0];
                audioElRef.current.play().catch(() => { /* gesture already satisfied */ });
            }
            setStatus('live');
        };
        pc.onconnectionstatechange = () => {
            const st = pc.connectionState;
            if ((st === 'failed' || st === 'disconnected') && activeRef.current) setStatus('waiting');
        };
        pcRef.current = pc;
        return pc;
    }, []);

    // Impolite peer creates the single offer once both sides are ready.
    const maybeOffer = useCallback(async () => {
        if (!activeRef.current || politeRef.current || !peerReadyRef.current) return;
        const pc = pcRef.current;
        if (!pc || pc.signalingState !== 'stable') return;
        try {
            makingOfferRef.current = true;
            await pc.setLocalDescription(await pc.createOffer());
            emit('voice_offer', { description: pc.localDescription });
        } catch { /* ignore */ } finally { makingOfferRef.current = false; }
    }, []);

    const enableVoice = useCallback(async () => {
        if (activeRef.current) return; // B3: guard double-enable
        const s = socketRef.current, r = roomIdRef.current;
        if (!s || !r) return;
        setError(null);
        setStatus('connecting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            activeRef.current = true;

            // B2: attach the audio sink to the DOM inside the gesture (iOS-safe).
            const el = document.createElement('audio');
            el.autoplay = true;
            (el as any).playsInline = true;
            el.style.display = 'none';
            document.body.appendChild(el);
            audioElRef.current = el;

            const pc = createPeer();
            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            setStatus('waiting');
            emit('voice_ready');       // announce to peer
            await maybeOffer();        // peer may already be ready
        } catch (err: any) {
            activeRef.current = false;
            setStatus('error');
            setError(err?.name === 'NotAllowedError'
                ? 'Microphone blocked — allow it in your browser settings to use voice.'
                : 'Could not start voice.');
        }
    }, [createPeer, maybeOffer]);

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

    // signaling
    useEffect(() => {
        if (!socket) return;

        const onPeerReady = () => { peerReadyRef.current = true; maybeOffer(); };

        const onOffer = async ({ description }: any) => {
            if (!activeRef.current) return; // not opted in → never receive audio
            peerReadyRef.current = true;
            const pc = pcRef.current ?? createPeer();
            const collision = description.type === 'offer' && (makingOfferRef.current || pc.signalingState !== 'stable');
            if (collision && !politeRef.current) return; // impolite ignores colliding offer
            try {
                if (collision) await Promise.all([
                    pc.setLocalDescription({ type: 'rollback' } as any),
                    pc.setRemoteDescription(description),
                ]);
                else await pc.setRemoteDescription(description);
                if (description.type === 'offer') {
                    if (localStreamRef.current && pc.getSenders().every(sn => !sn.track)) {
                        localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
                    }
                    await pc.setLocalDescription(await pc.createAnswer());
                    emit('voice_answer', { description: pc.localDescription });
                }
            } catch { /* ignore */ }
        };

        const onAnswer = async ({ description }: any) => {
            if (pcRef.current && description.type === 'answer') {
                try { await pcRef.current.setRemoteDescription(description); } catch { /* ignore */ }
            }
        };

        const onIce = async ({ candidate }: any) => {
            if (pcRef.current && candidate) { try { await pcRef.current.addIceCandidate(candidate); } catch { /* ignore */ } }
        };

        const onPeerEnd = () => { if (activeRef.current) teardown(false); };

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
    }, [socket, createPeer, maybeOffer, teardown]);

    // Tear down only when the feature is disabled or the component unmounts —
    // NOT on socket/room ref changes (B3: teardown has no such deps now).
    useEffect(() => {
        if (!enabled) teardown(true);
        return () => teardown(true);
    }, [enabled, teardown]);

    return { status, micMuted, remoteMuted, error, enableVoice, disableVoice, toggleMic, toggleRemote };
}
