import { create } from 'zustand';
import type { PresenceInfo } from '@ghost/types';
import { getSocket, joinProject, leaveProject, sendChat, sendSessionAction, deleteChatMessage } from '../lib/socket';
import { api } from '../lib/api';

interface ChatMessage {
  userId: string;
  displayName: string;
  colour: string;
  text: string;
  timestamp: number;
}

interface SessionState {
  isConnected: boolean;
  onlineUsers: PresenceInfo[];
  chatMessages: ChatMessage[];
  currentProjectId: string | null;

  join: (projectId: string) => void;
  leave: () => void;
  sendAction: (action: any) => void;
  sendMessage: (text: string) => void;
  deleteMessage: (index: number) => void;
}

// Stored reference so we can remove it on leave
let reconnectHandler: (() => void) | null = null;

export const useSessionStore = create<SessionState>((set, get) => ({
  isConnected: false,
  onlineUsers: [],
  chatMessages: [],
  currentProjectId: null,

  join: (projectId) => {
    const socket = getSocket();
    if (!socket) return;

    joinProject(projectId);
    set({ currentProjectId: projectId, isConnected: true });

    // Load persisted chat history, merging with any real-time messages that arrived first
    api.getChatHistory(projectId).then((history) => {
      set((s) => {
        // Keep any real-time messages that arrived after the last history message
        const lastHistoryTs = history.length > 0 ? history[history.length - 1].timestamp : 0;
        const newMessages = s.chatMessages.filter((m) => m.timestamp > lastHistoryTs);
        return { chatMessages: [...history, ...newMessages] };
      });
    }).catch(() => {});

    // Re-join room on reconnect (server creates a new socket, so room membership is lost)
    reconnectHandler = () => {
      const pid = get().currentProjectId;
      if (pid) joinProject(pid);
    };
    socket.on('connect', reconnectHandler);

    socket.on('presence-update', ({ users }) => {
      set({ onlineUsers: users });
    });

    socket.on('user-joined', ({ userId, displayName, colour }) => {
      set((s) => ({
        onlineUsers: [...s.onlineUsers.filter((u) => u.userId !== userId), {
          userId, displayName, colour, isOnline: true, lastSeen: new Date().toISOString(),
        }],
      }));
    });

    socket.on('user-left', ({ userId }) => {
      set((s) => ({ onlineUsers: s.onlineUsers.filter((u) => u.userId !== userId) }));
    });

    socket.on('chat-message', (msg) => {
      set((s) => ({ chatMessages: [...s.chatMessages, msg] }));
    });

    socket.on('delete-chat-message', ({ timestamp }) => {
      set((s) => ({ chatMessages: s.chatMessages.filter((m) => m.timestamp !== timestamp) }));
    });
  },

  leave: () => {
    const { currentProjectId } = get();
    if (currentProjectId) leaveProject(currentProjectId);

    const socket = getSocket();
    if (reconnectHandler) {
      socket?.off('connect', reconnectHandler);
      reconnectHandler = null;
    }
    socket?.off('presence-update');
    socket?.off('user-joined');
    socket?.off('user-left');
    socket?.off('chat-message');
    socket?.off('delete-chat-message');

    set({ currentProjectId: null, isConnected: false, onlineUsers: [], chatMessages: [] });
  },

  sendAction: (action) => {
    const { currentProjectId } = get();
    if (currentProjectId) sendSessionAction(currentProjectId, action);
  },

  sendMessage: (text) => {
    const { currentProjectId } = get();
    if (currentProjectId) sendChat(currentProjectId, text);
  },

  deleteMessage: (index) => {
    const { currentProjectId, chatMessages } = get();
    const msg = chatMessages[index];
    if (msg && currentProjectId) {
      deleteChatMessage(currentProjectId, msg.timestamp);
    }
  },
}));
