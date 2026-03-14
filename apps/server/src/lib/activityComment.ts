import { db } from '../db/index.js';
import { comments, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Post an activity comment to a project.
 * Persists to the comments table only — kept separate from chat.
 */
export function postActivityComment(projectId: string, userId: string, message: string) {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.insert(comments).values({
      id,
      projectId,
      authorId: userId,
      text: message,
      createdAt: now,
      updatedAt: now,
    }).run();
  } catch (err) {
    console.error('Activity comment failed:', err);
  }
}
