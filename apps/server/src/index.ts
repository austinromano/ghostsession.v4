import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { serve } from '@hono/node-server';
import { createServer } from 'node:http';
import { ZodError } from 'zod';
import auth from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import trackRoutes from './routes/tracks.js';
import versionRoutes from './routes/versions.js';
import commentRoutes from './routes/comments.js';
import fileRoutes from './routes/files.js';
import sessionRoutes from './routes/sessions.js';
import invitationRoutes from './routes/invitations.js';
import userRoutes from './routes/users.js';
import likeRoutes from './routes/likes.js';
import samplePackRoutes from './routes/samplepacks.js';
import notificationRoutes from './routes/notifications.js';
import { setupWebSocket } from './ws/index.js';
import { initDatabase } from './db/index.js';

// Initialize database tables
initDatabase();

const app = new Hono();

// Global middleware
app.use('*', cors());

// API routes
app.route('/api/v1/auth', auth);
app.route('/api/v1/projects', projectRoutes);
app.route('/api/v1/projects/:id/tracks', trackRoutes);
app.route('/api/v1/projects/:id/versions', versionRoutes);
app.route('/api/v1/projects/:id/comments', commentRoutes);
app.route('/api/v1/projects/:id/files', fileRoutes);
app.route('/api/v1/projects/:id/sessions', sessionRoutes);
app.route('/api/v1/invitations', invitationRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/tracks', likeRoutes);
app.route('/api/v1/sample-packs', samplePackRoutes);
app.route('/api/v1/notifications', notificationRoutes);

// Serve the desktop app build for plugin WebView (production mode)
import { serveStatic } from '@hono/node-server/serve-static';
app.use('/app/*', serveStatic({ root: '../desktop/dist', rewriteRequestPath: (p) => p.replace('/app', '') }));
app.get('/app', serveStatic({ root: '../desktop/dist', path: '/index.html' }));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: 'Validation error',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    }, 400);
  }
  console.error('[Server Error]', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

// Start server
const port = parseInt(process.env.PORT || '3000', 10);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`\n  Ghost Session API running on http://localhost:${info.port}`);
  console.log(`  WebSocket ready on ws://localhost:${info.port}\n`);
});

// Attach Socket.IO to the HTTP server
setupWebSocket(server as any);
