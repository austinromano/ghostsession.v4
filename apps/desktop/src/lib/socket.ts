import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, StreamType } from '@ghost/protocol';
import type { PresenceInfo } from '@ghost/types';

type GhostSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

let socket: GhostSocket | null = null;

export function connectSocket(token: string): GhostSocket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => console.log('[WS] Connected'));
  socket.on('disconnect', () => console.log('[WS] Disconnected'));

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): GhostSocket | null {
  return socket;
}

export function joinProject(projectId: string) {
  socket?.emit('join-project', { projectId });
}

export function leaveProject(projectId: string) {
  socket?.emit('leave-project', { projectId });
}

export function sendSessionAction(projectId: string, action: any) {
  socket?.emit('session-action', { projectId, action });
}

export function sendChat(projectId: string, text: string) {
  socket?.emit('chat-message', { projectId, text });
}

export function deleteChatMessage(projectId: string, timestamp: number) {
  socket?.emit('delete-chat-message', { projectId, timestamp });
}

// WebRTC signaling
export function sendWebRTCOffer(projectId: string, targetUserId: string, offer: RTCSessionDescriptionInit, streamType?: StreamType) {
  socket?.emit('webrtc-offer', { projectId, targetUserId, offer, streamType });
}

export function sendWebRTCAnswer(projectId: string, targetUserId: string, answer: RTCSessionDescriptionInit, streamType?: StreamType) {
  socket?.emit('webrtc-answer', { projectId, targetUserId, answer, streamType });
}

export function sendICECandidate(projectId: string, targetUserId: string, candidate: RTCIceCandidateInit, streamType?: StreamType) {
  socket?.emit('webrtc-ice-candidate', { projectId, targetUserId, candidate, streamType });
}

export function sendWebRTCLeave(projectId: string, streamType?: StreamType) {
  socket?.emit('webrtc-leave', { projectId, streamType });
}
