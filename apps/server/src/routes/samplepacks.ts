import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { samplePacks, samplePackItems } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';

const samplePackRoutes = new Hono();
samplePackRoutes.use('*', authMiddleware);

const createPackSchema = z.object({
  name: z.string().min(1).max(100),
});

// GET / — List user's sample packs
samplePackRoutes.get('/', async (c) => {
  const user = c.get('user') as AuthUser;
  const packs = db.select().from(samplePacks)
    .where(eq(samplePacks.ownerId, user.id))
    .orderBy(desc(samplePacks.updatedAt))
    .all();
  return c.json({ success: true, data: packs });
});

// POST / — Create sample pack
samplePackRoutes.post('/', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = createPackSchema.parse(await c.req.json());
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(samplePacks).values({
    id, name: body.name, ownerId: user.id, createdAt: now, updatedAt: now,
  }).run();

  const [pack] = db.select().from(samplePacks).where(eq(samplePacks.id, id)).all();
  return c.json({ success: true, data: pack }, 201);
});

// GET /:id — Get pack with items
samplePackRoutes.get('/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const packId = c.req.param('id');

  const [pack] = db.select().from(samplePacks)
    .where(eq(samplePacks.id, packId)).limit(1).all();

  if (!pack) throw new HTTPException(404, { message: 'Sample pack not found' });
  if (pack.ownerId !== user.id) throw new HTTPException(403, { message: 'Not authorized' });

  const items = db.select().from(samplePackItems)
    .where(eq(samplePackItems.packId, packId))
    .orderBy(samplePackItems.position)
    .all();

  return c.json({ success: true, data: { ...pack, items } });
});

// PATCH /:id — Update pack
samplePackRoutes.patch('/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const packId = c.req.param('id');
  const body = createPackSchema.partial().parse(await c.req.json());

  const [pack] = db.select().from(samplePacks)
    .where(eq(samplePacks.id, packId)).limit(1).all();

  if (!pack) throw new HTTPException(404, { message: 'Sample pack not found' });
  if (pack.ownerId !== user.id) throw new HTTPException(403, { message: 'Only owner can edit' });

  db.update(samplePacks).set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(samplePacks.id, packId)).run();

  const [updated] = db.select().from(samplePacks).where(eq(samplePacks.id, packId)).all();
  return c.json({ success: true, data: updated });
});

// DELETE /:id — Delete pack
samplePackRoutes.delete('/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const packId = c.req.param('id');

  const [pack] = db.select().from(samplePacks)
    .where(eq(samplePacks.id, packId)).limit(1).all();

  if (!pack || pack.ownerId !== user.id) {
    throw new HTTPException(403, { message: 'Only owner can delete' });
  }

  db.delete(samplePacks).where(eq(samplePacks.id, packId)).run();
  return c.json({ success: true });
});

// POST /:id/items — Add item to pack
samplePackRoutes.post('/:id/items', async (c) => {
  const user = c.get('user') as AuthUser;
  const packId = c.req.param('id');
  const body = z.object({
    name: z.string().min(1),
    fileId: z.string().optional(),
  }).parse(await c.req.json());

  const [pack] = db.select().from(samplePacks)
    .where(eq(samplePacks.id, packId)).limit(1).all();

  if (!pack || pack.ownerId !== user.id) {
    throw new HTTPException(403, { message: 'Not authorized' });
  }

  const existing = db.select().from(samplePackItems)
    .where(eq(samplePackItems.packId, packId)).all();

  const id = crypto.randomUUID();
  db.insert(samplePackItems).values({
    id, packId, name: body.name, fileId: body.fileId,
    position: existing.length, createdAt: new Date().toISOString(),
  }).run();

  const [item] = db.select().from(samplePackItems).where(eq(samplePackItems.id, id)).all();

  // Update pack's updatedAt
  db.update(samplePacks).set({ updatedAt: new Date().toISOString() })
    .where(eq(samplePacks.id, packId)).run();

  return c.json({ success: true, data: item }, 201);
});

// DELETE /:id/items/:itemId — Remove item from pack
samplePackRoutes.delete('/:id/items/:itemId', async (c) => {
  const user = c.get('user') as AuthUser;
  const packId = c.req.param('id');
  const itemId = c.req.param('itemId');

  const [pack] = db.select().from(samplePacks)
    .where(eq(samplePacks.id, packId)).limit(1).all();

  if (!pack || pack.ownerId !== user.id) {
    throw new HTTPException(403, { message: 'Not authorized' });
  }

  db.delete(samplePackItems)
    .where(and(eq(samplePackItems.packId, packId), eq(samplePackItems.id, itemId)))
    .run();

  // Update pack's updatedAt
  db.update(samplePacks).set({ updatedAt: new Date().toISOString() })
    .where(eq(samplePacks.id, packId)).run();

  return c.json({ success: true });
});

export default samplePackRoutes;
