import { db } from '../db/index.js';
import { versions, projects, tracks, files } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

/**
 * Auto-create a project snapshot (version) whenever a meaningful change happens.
 * Captures full project state: settings, all tracks with their config, and file manifest.
 */
export function createAutoSnapshot(projectId: string, userId: string, actionName: string) {
  try {
    // Get current project state
    const [project] = db.select().from(projects).where(eq(projects.id, projectId)).all();
    if (!project) return;

    // Get all tracks
    const projectTracks = db.select().from(tracks).where(eq(tracks.projectId, projectId)).orderBy(tracks.position).all();

    // Get all files for manifest
    const projectFiles = db.select().from(files).where(eq(files.projectId, projectId)).all();

    // Build file manifest
    const manifest = projectFiles.map((f) => {
      const track = projectTracks.find((t) => t.fileId === f.id);
      return {
        fileId: f.id,
        fileName: f.fileName,
        trackId: track?.id || null,
        trackName: track?.name || null,
        fileSize: f.fileSize,
      };
    });

    // Build full project snapshot (includes file records for restore)
    const snapshot = {
      name: project.name,
      description: project.description || '',
      tempo: project.tempo || 140,
      key: project.key || 'C',
      genre: project.genre || '',
      timeSignature: project.timeSignature || '4/4',
      tracks: projectTracks.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        ownerId: t.ownerId,
        fileId: t.fileId,
        fileName: t.fileName,
        volume: t.volume ?? 0.8,
        pan: t.pan ?? 0,
        muted: t.muted ?? false,
        soloed: t.soloed ?? false,
        bpm: t.bpm ?? null,
        key: t.key ?? null,
        position: t.position ?? 0,
      })),
      files: projectFiles.map((f) => ({
        id: f.id,
        projectId: f.projectId,
        uploadedBy: f.uploadedBy,
        fileName: f.fileName,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        s3Key: f.s3Key,
        createdAt: f.createdAt,
      })),
    };

    // Get next version number
    const existing = db.select().from(versions)
      .where(eq(versions.projectId, projectId))
      .orderBy(desc(versions.versionNumber))
      .limit(1).all();
    const nextVersion = existing.length > 0 ? existing[0].versionNumber + 1 : 1;

    // Insert version
    const id = crypto.randomUUID();
    db.insert(versions).values({
      id,
      projectId,
      versionNumber: nextVersion,
      name: actionName,
      description: '',
      createdBy: userId,
      fileManifestJson: manifest,
      snapshotJson: snapshot,
      createdAt: new Date().toISOString(),
    }).run();

    // Update project's updatedAt
    db.update(projects).set({ updatedAt: new Date().toISOString() })
      .where(eq(projects.id, projectId)).run();
  } catch (err) {
    // Don't let snapshot failures break the main operation
    console.error('Auto-snapshot failed:', err);
  }
}
