import { Hono } from 'hono';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';

const notificationRoutes = new Hono();
notificationRoutes.use('*', authMiddleware);

// Get unread notifications
notificationRoutes.get('/', async (c) => {
  const user = c.get('user') as AuthUser;

  const results = db.select()
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)))
    .orderBy(desc(notifications.createdAt))
    .limit(50)
    .all();

  return c.json({ success: true, data: results });
});

// Mark all as read
notificationRoutes.post('/read', async (c) => {
  const user = c.get('user') as AuthUser;

  db.update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)))
    .run();

  return c.json({ success: true });
});

export default notificationRoutes;
