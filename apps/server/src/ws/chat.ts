import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@ghost/protocol';
import { db } from '../db/index.js';
import { chatMessages, projectMembers, projects, notifications } from '../db/schema.js';
import { eq, and, ne } from 'drizzle-orm';

type GhostSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerChatHandlers(io: Server, socket: GhostSocket) {
  socket.on('chat-message', ({ projectId, text }) => {
    const room = `project:${projectId}`;
    const timestamp = Date.now();

    const msg = {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      colour: socket.data.colour,
      text,
      timestamp,
    };

    // Broadcast to everyone in room including sender
    io.to(room).emit('chat-message', msg);

    // Persist to database and create notifications
    try {
      db.insert(chatMessages).values({
        id: crypto.randomUUID(),
        projectId,
        userId: socket.data.userId,
        displayName: socket.data.displayName,
        colour: socket.data.colour,
        text,
        createdAt: new Date(timestamp).toISOString(),
      }).run();

      // Get project name for notification
      const [project] = db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1).all();
      const projectName = project?.name || 'a project';

      // Notify all project members except the sender
      const members = db.select({ userId: projectMembers.userId })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), ne(projectMembers.userId, socket.data.userId)))
        .all();

      const now = new Date().toISOString();
      for (const member of members) {
        db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: member.userId,
          type: 'chat',
          message: `${socket.data.displayName} in ${projectName}: ${text.length > 50 ? text.slice(0, 50) + '...' : text}`,
          createdAt: now,
        }).run();
      }
    } catch (err) {
      console.error('Failed to persist chat message:', err);
    }
  });

  socket.on('delete-chat-message', ({ projectId, timestamp }) => {
    const room = `project:${projectId}`;
    const ts = new Date(timestamp).toISOString();

    // Delete from DB
    try {
      db.delete(chatMessages)
        .where(and(eq(chatMessages.projectId, projectId), eq(chatMessages.userId, socket.data.userId), eq(chatMessages.createdAt, ts)))
        .run();
    } catch (err) {
      console.error('Failed to delete chat message:', err);
    }

    // Broadcast deletion to all clients in room
    io.to(room).emit('delete-chat-message', { timestamp });
  });
}
