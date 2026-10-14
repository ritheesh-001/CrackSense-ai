import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { OfflineIncidentRecord, SeverityLevel } from '../types/models';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase | null> | null = null;

/**
 * Initializes and migrates the SQLite offline database safely.
 * Returns true if successful or false if an error occurred.
 */
export async function initOfflineDb(): Promise<boolean> {
  try {
    const db = await getDatabase();
    return db !== null;
  } catch (err) {
    console.warn('SQLite initOfflineDb warning (proceeding with fallback):', err);
    return false;
  }
}

/**
 * Safely retrieves or opens the SQLite database instance.
 * Individual PRAGMA and table creations are isolated so WAL pragma failures
 * do not crash the app in Expo Go.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('cracksense_offline.db');

      // Attempt to set WAL journal mode safely
      try {
        await db.execAsync('PRAGMA journal_mode = WAL;');
      } catch (pragmaErr) {
        // WAL is optional; Expo Go on some Android virtual filesystems does not support WAL
        console.warn('PRAGMA journal_mode WAL notice (using default):', pragmaErr);
      }

      // Create offline_incidents table safely
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS offline_incidents (
          id TEXT PRIMARY KEY NOT NULL,
          local_image_path TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          severity TEXT NOT NULL,
          confidence REAL NOT NULL,
          crack_count INTEGER NOT NULL,
          dimensions TEXT NOT NULL,
          detections_json TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Cloud AI analysis pending.',
          created_at TEXT NOT NULL,
          is_synced INTEGER NOT NULL DEFAULT 0
        );
      `);

      // Ensure status column exists if migrated from earlier schema
      try {
        await db.execAsync(`
          ALTER TABLE offline_incidents ADD COLUMN status TEXT DEFAULT 'Cloud AI analysis pending.';
        `);
      } catch {
        // Column already exists
      }

      dbInstance = db;
      return dbInstance;
    } catch (err) {
      console.warn('Failed to open or initialize SQLite database:', err);
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Persists an image permanently to FileSystem.documentDirectory.
 * Never relies on temporary cache URIs.
 */
export async function persistOfflineImage(sourceUri: string): Promise<string> {
  if (!sourceUri || !sourceUri.startsWith('file://')) {
    return sourceUri;
  }
  try {
    const filename = `offline_evidence_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const docDir = FileSystem.documentDirectory;
    if (!docDir) {
      return sourceUri;
    }
    const targetPath = `${docDir}${filename}`;
    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetPath
    });
    return targetPath;
  } catch (err) {
    console.warn('Could not copy file to documentDirectory, fallback to source:', err);
    return sourceUri;
  }
}

/**
 * Enqueue a new offline incident with status "Cloud AI analysis pending."
 */
export async function enqueueOfflineIncident(incident: {
  localImageUri: string;
  latitude: number | null;
  longitude: number | null;
  severity?: SeverityLevel;
  confidence?: number;
  crackCount?: number;
  dimensions?: string;
  detectionsJson?: string;
  status?: string;
}): Promise<OfflineIncidentRecord> {
  const id = `off_${Date.now()}_${Math.random().toString(36).substring(6)}`;
  const permanentPath = await persistOfflineImage(incident.localImageUri);
  const createdAt = new Date().toISOString();
  const status = incident.status || 'Cloud AI analysis pending.';
  const severity = incident.severity || 'LOW';
  const confidence = incident.confidence ?? 0.0;
  const crackCount = incident.crackCount ?? 0;
  const dimensions = incident.dimensions || 'Pending Analysis';
  const detectionsJson = incident.detectionsJson || '[]';

  const record: OfflineIncidentRecord = {
    id,
    local_image_path: permanentPath,
    latitude: incident.latitude,
    longitude: incident.longitude,
    severity,
    confidence,
    crack_count: crackCount,
    dimensions,
    detections_json: detectionsJson,
    status,
    created_at: createdAt,
    is_synced: 0
  };

  try {
    const db = await getDatabase();
    if (db) {
      await db.runAsync(
        `INSERT INTO offline_incidents 
          (id, local_image_path, latitude, longitude, severity, confidence, crack_count, dimensions, detections_json, status, created_at, is_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [
          id,
          permanentPath,
          incident.latitude,
          incident.longitude,
          severity,
          confidence,
          crackCount,
          dimensions,
          detectionsJson,
          status,
          createdAt
        ]
      );
    }
  } catch (err) {
    console.warn('SQLite enqueueOfflineIncident notice:', err);
  }

  return record;
}

/**
 * Get all queued offline incidents from SQLite database safely
 */
export async function getOfflineIncidents(): Promise<OfflineIncidentRecord[]> {
  try {
    const db = await getDatabase();
    if (!db) {
      return [];
    }
    const rows = await db.getAllAsync<OfflineIncidentRecord>(
      'SELECT * FROM offline_incidents ORDER BY created_at DESC;'
    );
    return rows || [];
  } catch (err) {
    console.warn('SQLite getOfflineIncidents notice:', err);
    return [];
  }
}

/**
 * Update status of an incident (e.g., "Sync failed – Retry")
 */
export async function updateIncidentStatus(
  id: string,
  status: string,
  updates?: {
    severity?: SeverityLevel;
    confidence?: number;
    crackCount?: number;
    dimensions?: string;
    detectionsJson?: string;
  }
): Promise<void> {
  try {
    const db = await getDatabase();
    if (!db) return;

    if (updates) {
      await db.runAsync(
        `UPDATE offline_incidents 
         SET status = ?, severity = COALESCE(?, severity), confidence = COALESCE(?, confidence),
             crack_count = COALESCE(?, crack_count), dimensions = COALESCE(?, dimensions),
             detections_json = COALESCE(?, detections_json)
         WHERE id = ?;`,
        [
          status,
          updates.severity ?? null,
          updates.confidence ?? null,
          updates.crackCount ?? null,
          updates.dimensions ?? null,
          updates.detectionsJson ?? null,
          id
        ]
      );
    } else {
      await db.runAsync('UPDATE offline_incidents SET status = ? WHERE id = ?;', [status, id]);
    }
  } catch (err) {
    console.warn('SQLite updateIncidentStatus notice:', err);
  }
}

/**
 * Mark an offline incident as synced
 */
export async function markIncidentSynced(
  id: string,
  updates?: {
    severity?: SeverityLevel;
    confidence?: number;
    crackCount?: number;
    dimensions?: string;
    detectionsJson?: string;
  }
): Promise<void> {
  try {
    const db = await getDatabase();
    if (!db) return;

    if (updates) {
      await db.runAsync(
        `UPDATE offline_incidents 
         SET is_synced = 1, status = 'Synced',
             severity = COALESCE(?, severity), confidence = COALESCE(?, confidence),
             crack_count = COALESCE(?, crack_count), dimensions = COALESCE(?, dimensions),
             detections_json = COALESCE(?, detections_json)
         WHERE id = ?;`,
        [
          updates.severity ?? null,
          updates.confidence ?? null,
          updates.crackCount ?? null,
          updates.dimensions ?? null,
          updates.detectionsJson ?? null,
          id
        ]
      );
    } else {
      await db.runAsync(
        "UPDATE offline_incidents SET is_synced = 1, status = 'Synced' WHERE id = ?;",
        [id]
      );
    }
  } catch (err) {
    console.warn('SQLite markIncidentSynced notice:', err);
  }
}

/**
 * Delete a synced incident. Never deletes un-synced evidence!
 */
export async function deleteOfflineIncident(id: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    if (!db) return false;

    const item = await db.getFirstAsync<OfflineIncidentRecord>(
      'SELECT is_synced, local_image_path FROM offline_incidents WHERE id = ?;',
      [id]
    );

    if (!item) return false;

    // Enforce rule: Never delete local evidence before sync succeeds
    if (item.is_synced !== 1) {
      console.warn('Blocked deletion of unsynced evidence record:', id);
      return false;
    }

    // Delete permanent local file safely
    try {
      if (item.local_image_path && item.local_image_path.startsWith('file://')) {
        await FileSystem.deleteAsync(item.local_image_path, { idempotent: true });
      }
    } catch (err) {
      console.warn('File cleanup notice:', err);
    }

    await db.runAsync('DELETE FROM offline_incidents WHERE id = ?;', [id]);
    return true;
  } catch (err) {
    console.warn('SQLite deleteOfflineIncident notice:', err);
    return false;
  }
}
