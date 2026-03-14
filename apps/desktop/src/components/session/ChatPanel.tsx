import { useState, useRef, useEffect, useCallback } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useAuthStore } from '../../stores/authStore';
import {
  getSocket,
  sendWebRTCOffer,
  sendWebRTCAnswer,
  sendICECandidate,
  sendWebRTCLeave,
} from '../../lib/socket';
import type { StreamType } from '@ghost/protocol';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

interface PeerState {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  displayName: string;
}

// Use prefixed keys: "camera:userId" or "screen:userId"
function peerKey(userId: string, streamType: StreamType): string {
  return `${streamType}:${userId}`;
}

export default function ChatPanel() {
  const { chatMessages, sendMessage, deleteMessage, onlineUsers, currentProjectId } = useSessionStore();
  const userId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Camera state
  const [videoOn, setVideoOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Screen share state
  const [screenOn, setScreenOn] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const localScreenRef = useRef<HTMLVideoElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // All peer connections (camera + screen) keyed by "camera:userId" or "screen:userId"
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const [peerStreams, setPeerStreams] = useState<Map<string, { stream: MediaStream; displayName: string; streamType: StreamType }>>(new Map());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
      screenStream?.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
      peersRef.current.forEach((peer) => peer.pc.close());
    };
  }, []);

  const createPeerConnection = useCallback((remoteUserId: string, displayName: string, streamType: StreamType, sourceStream: MediaStream | null) => {
    const key = peerKey(remoteUserId, streamType);
    const existing = peersRef.current.get(key);
    if (existing) return existing.pc;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks from the appropriate stream
    if (sourceStream) {
      sourceStream.getTracks().forEach((track) => pc.addTrack(track, sourceStream));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && currentProjectId) {
        sendICECandidate(currentProjectId, remoteUserId, e.candidate.toJSON(), streamType);
      }
    };

    pc.ontrack = (e) => {
      const [remoteStream] = e.streams;
      if (remoteStream) {
        setPeerStreams((prev) => {
          const next = new Map(prev);
          next.set(key, { stream: remoteStream, displayName, streamType });
          return next;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        peersRef.current.delete(key);
        setPeerStreams((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }
    };

    peersRef.current.set(key, { pc, stream: null, displayName });
    return pc;
  }, [currentProjectId]);

  // Wire up signaling listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOffer = async ({ fromUserId, offer, streamType: st }: { fromUserId: string; offer: RTCSessionDescriptionInit; streamType?: StreamType }) => {
      if (!currentProjectId) return;
      const sType = st || 'camera';

      // For camera offers, we need localStream; for screen offers, receiver doesn't need a stream
      const sourceStream = sType === 'camera' ? localStream : null;

      // Only require localStream for camera offers we need to respond to
      if (sType === 'camera' && !localStream) return;

      const pc = createPeerConnection(fromUserId, '', sType, sourceStream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendWebRTCAnswer(currentProjectId, fromUserId, answer, sType);
    };

    const handleAnswer = async ({ fromUserId, answer, streamType: st }: { fromUserId: string; answer: RTCSessionDescriptionInit; streamType?: StreamType }) => {
      const sType = st || 'camera';
      const key = peerKey(fromUserId, sType);
      const peer = peersRef.current.get(key);
      if (peer) {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ fromUserId, candidate, streamType: st }: { fromUserId: string; candidate: RTCIceCandidateInit; streamType?: StreamType }) => {
      const sType = st || 'camera';
      const key = peerKey(fromUserId, sType);
      const peer = peersRef.current.get(key);
      if (peer) {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleUserLeft = ({ userId: leftUserId, streamType: st }: { userId: string; streamType?: StreamType }) => {
      // If streamType specified, only clean up that type; otherwise clean up both
      const types: StreamType[] = st ? [st] : ['camera', 'screen'];
      for (const sType of types) {
        const key = peerKey(leftUserId, sType);
        const peer = peersRef.current.get(key);
        if (peer) {
          peer.pc.close();
          peersRef.current.delete(key);
          setPeerStreams((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        }
      }
    };

    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);
    socket.on('webrtc-user-left', handleUserLeft);

    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleIceCandidate);
      socket.off('webrtc-user-left', handleUserLeft);
    };
  }, [localStream, screenStream, currentProjectId, createPeerConnection]);

  // Attach local camera to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, videoOn]);

  // Attach local screen to video element
  useEffect(() => {
    if (localScreenRef.current && screenStream) {
      localScreenRef.current.srcObject = screenStream;
    }
  }, [screenStream, screenOn]);

  // ── Camera ──────────────────────────────────────────────────────────

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setVideoOn(true);

      if (currentProjectId) {
        for (const u of onlineUsers) {
          if (u.userId === userId) continue;
          const pc = createPeerConnection(u.userId, u.displayName, 'camera', stream);
          stream.getTracks().forEach((track) => {
            if (!pc.getSenders().find((s) => s.track === track)) {
              pc.addTrack(track, stream);
            }
          });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendWebRTCOffer(currentProjectId, u.userId, offer, 'camera');
        }
      }
    } catch (err) {
      console.error('Failed to access camera:', err);
    }
  };

  const stopVideo = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
      setLocalStream(null);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    // Close camera peer connections
    peersRef.current.forEach((peer, key) => {
      if (key.startsWith('camera:')) {
        peer.pc.close();
        peersRef.current.delete(key);
      }
    });
    setPeerStreams((prev) => {
      const next = new Map(prev);
      for (const key of prev.keys()) {
        if (key.startsWith('camera:')) next.delete(key);
      }
      return next;
    });
    setVideoOn(false);
    if (currentProjectId) {
      sendWebRTCLeave(currentProjectId, 'camera');
    }
  };

  // ── Screen Share ────────────────────────────────────────────────────

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setScreenStream(stream);
      setScreenOn(true);

      // When user clicks browser's "Stop sharing" button
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

      if (currentProjectId) {
        for (const u of onlineUsers) {
          if (u.userId === userId) continue;
          const pc = createPeerConnection(u.userId, u.displayName, 'screen', stream);
          stream.getTracks().forEach((track) => {
            if (!pc.getSenders().find((s) => s.track === track)) {
              pc.addTrack(track, stream);
            }
          });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendWebRTCOffer(currentProjectId, u.userId, offer, 'screen');
        }
      }
    } catch (err) {
      console.error('Failed to share screen:', err);
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
      setScreenStream(null);
    }
    if (localScreenRef.current) {
      localScreenRef.current.srcObject = null;
    }
    // Close screen peer connections
    peersRef.current.forEach((peer, key) => {
      if (key.startsWith('screen:')) {
        peer.pc.close();
        peersRef.current.delete(key);
      }
    });
    setPeerStreams((prev) => {
      const next = new Map(prev);
      for (const key of prev.keys()) {
        if (key.startsWith('screen:')) next.delete(key);
      }
      return next;
    });
    setScreenOn(false);
    if (currentProjectId) {
      sendWebRTCLeave(currentProjectId, 'screen');
    }
  };

  // ── Chat ────────────────────────────────────────────────────────────

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
  };

  // Split peer streams into camera and screen
  const cameraStreams = new Map<string, { stream: MediaStream; displayName: string }>();
  const screenShareStreams = new Map<string, { stream: MediaStream; displayName: string }>();
  peerStreams.forEach(({ stream, displayName, streamType }, key) => {
    const uid = key.replace(/^(camera|screen):/, '');
    if (streamType === 'screen') {
      screenShareStreams.set(uid, { stream, displayName });
    } else {
      cameraStreams.set(uid, { stream, displayName });
    }
  });

  const showMediaArea = videoOn || screenOn || screenShareStreams.size > 0 || cameraStreams.size > 0;

  return (
    <div className="flex flex-col h-full">

      {/* Media area */}
      {showMediaArea && (
        <div className="border-b border-ghost-border bg-ghost-bg p-1.5 space-y-1.5">
          {/* Screen shares — displayed large */}
          {(screenOn || screenShareStreams.size > 0) && (
            <div className="space-y-1">
              {/* Local screen share */}
              {screenOn && (
                <div className="relative rounded overflow-hidden bg-black aspect-video">
                  <video
                    ref={localScreenRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute bottom-1 left-1 text-[9px] font-bold text-white bg-blue-500/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    Your screen
                  </span>
                </div>
              )}
              {/* Remote screen shares */}
              {Array.from(screenShareStreams.entries()).map(([uid, { stream, displayName }]) => (
                <RemoteVideo key={`screen-${uid}`} stream={stream} displayName={displayName} isScreen />
              ))}
            </div>
          )}

          {/* Camera feeds — displayed as small grid */}
          {(videoOn || cameraStreams.size > 0) && (
            <div className="grid gap-1" style={{
              gridTemplateColumns: (videoOn ? 1 : 0) + cameraStreams.size <= 1 ? '1fr' : 'repeat(2, 1fr)',
            }}>
              {/* Local camera */}
              {videoOn && (
                <div className="relative rounded overflow-hidden bg-black aspect-video">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                    You
                  </span>
                </div>
              )}
              {/* Remote cameras */}
              {Array.from(cameraStreams.entries()).map(([uid, { stream, displayName }]) => (
                <RemoteVideo key={`cam-${uid}`} stream={stream} displayName={displayName} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat messages — newest at top, Discord-style spacing */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ghost-text-muted/30">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-[15px] text-ghost-text-secondary font-semibold text-center">Start the conversation</p>
            <p className="text-[14px] text-ghost-text-muted text-center">Send a message to<br />your collaborators</p>
          </div>
        )}
        {(() => {
          const reversed = [...chatMessages].reverse();
          return reversed.map((msg, i) => {
            const origIndex = chatMessages.length - 1 - i;
            const prevMsg = reversed[i - 1];
            const sameUser = prevMsg && prevMsg.userId === msg.userId;
            return (
            <div key={origIndex} className={`group hover:bg-ghost-surface-hover/20 -mx-3 px-3 rounded transition-colors relative ${sameUser ? 'py-[1px]' : 'pt-2.5 pb-[1px]'}`}>
              {!sameUser ? (
                <p className="text-[14px] leading-[1.375]">
                  <span className="font-medium" style={{ color: msg.colour }}>{msg.displayName}</span>
                  <span className="text-ghost-text-secondary ml-1.5">{msg.text}</span>
                </p>
              ) : (
                <p className="text-[14px] leading-[1.375] text-ghost-text-secondary">{msg.text}</p>
              )}
              {msg.userId === userId && (
                <button
                  onClick={() => deleteMessage(origIndex)}
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-ghost-text-muted hover:text-ghost-error-red hover:bg-ghost-error-red/10 transition-all"
                  title="Delete message"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>
          );
          });
        })()}
      </div>

      {/* Chat input — Discord style */}
      <div className="px-3 pb-3 pt-1 relative">
        {/* Emoji picker */}
        {showEmoji && (
          <div
            ref={emojiRef}
            className="absolute bottom-14 right-2 w-[220px] bg-[#111214] border border-ghost-border rounded-lg shadow-popup animate-popup p-2 z-50"
          >
            <div className="text-[10px] font-semibold text-ghost-text-muted uppercase tracking-wider px-1 pb-1.5">Smileys</div>
            <div className="grid grid-cols-7 gap-0.5">
              {['😀','😂','😍','🥳','😎','🤩','🥰','😭','🔥','💀','👀','💯','🎵','🎶','🎤','🎧','🎸','🥁','🎹','👻','✨'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { setText((prev) => prev + emoji); setShowEmoji(false); }}
                  className="w-7 h-7 flex items-center justify-center text-base hover:bg-ghost-surface-hover rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="text-[10px] font-semibold text-ghost-text-muted uppercase tracking-wider px-1 pt-2 pb-1.5">Hands</div>
            <div className="grid grid-cols-7 gap-0.5">
              {['👍','👎','👏','🙌','🤝','✌️','🤟','🤙','💪','🫶','👊','✊','🫡','🎉'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { setText((prev) => prev + emoji); setShowEmoji(false); }}
                  className="w-7 h-7 flex items-center justify-center text-base hover:bg-ghost-surface-hover rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center bg-ghost-surface-hover/60 rounded-lg border border-ghost-border/30">
          <input
            className="flex-1 min-w-0 bg-transparent text-[14px] text-ghost-text-primary placeholder:text-ghost-text-muted pl-3 py-2.5 pr-2 outline-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message..."
          />
          {/* Screen share icon */}
          <button
            onClick={screenOn ? stopScreenShare : startScreenShare}
            className={`shrink-0 w-8 h-8 flex items-center justify-center transition-colors rounded ${screenOn ? 'text-red-500 hover:text-red-400' : 'text-ghost-text-muted hover:text-ghost-text-primary'}`}
            title={screenOn ? 'Stop screen share' : 'Share screen'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </button>
          {/* Video icon */}
          <button
            onClick={videoOn ? stopVideo : startVideo}
            className={`shrink-0 w-8 h-8 flex items-center justify-center transition-colors rounded ${videoOn ? 'text-red-500 hover:text-red-400' : 'text-ghost-text-muted hover:text-ghost-text-primary'}`}
            title={videoOn ? 'Stop video' : 'Start video'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {videoOn ? (
                <>
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </>
              )}
            </svg>
          </button>
          {/* Emoji button */}
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className={`shrink-0 w-8 h-8 flex items-center justify-center transition-colors rounded ${showEmoji ? 'text-ghost-green' : 'text-ghost-text-muted hover:text-ghost-text-primary'}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-4-9a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zm5 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zm-5.5 3.5a.75.75 0 0 1 1.06.02A4.47 4.47 0 0 0 12 16a4.47 4.47 0 0 0 3.44-1.48.75.75 0 1 1 1.08 1.04A5.97 5.97 0 0 1 12 17.5a5.97 5.97 0 0 1-4.52-1.94.75.75 0 0 1 .02-1.06z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function RemoteVideo({ stream, displayName, isScreen }: { stream: MediaStream; displayName: string; isScreen?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded overflow-hidden bg-black aspect-video">
      <video ref={ref} autoPlay playsInline className={`w-full h-full ${isScreen ? 'object-contain' : 'object-cover'}`} />
      <span className={`absolute bottom-1 left-1 text-[9px] font-bold text-white px-1.5 py-0.5 rounded flex items-center gap-1 ${isScreen ? 'bg-blue-500/80' : 'bg-black/60'}`}>
        {isScreen && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}
        {displayName}{isScreen ? "'s screen" : ''}
      </span>
    </div>
  );
}
