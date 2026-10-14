import * as Network from 'expo-network';
import {
  saveInspectionRecord,
  triggerEmergencySOS,
  uploadImageToStorage
} from './insforge';
import {
  getOfflineIncidents,
  markIncidentSynced,
  updateIncidentStatus
} from './offlineDb';
import { detectCracksWithYOLO } from './yoloService';

export interface SyncProgressCallback {
  (statusMessage: string, isSyncing: boolean): void;
}

let syncListeners: SyncProgressCallback[] = [];
let isSyncInProgress = false;
let lastKnownOnlineState: boolean | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;
let networkSubscription: { remove: () => void } | null = null;

export function addSyncListener(cb: SyncProgressCallback): () => void {
  syncListeners.push(cb);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== cb);
  };
}

function notifySyncListeners(message: string, isSyncing: boolean) {
  for (const listener of syncListeners) {
    try {
      listener(message, isSyncing);
    } catch (err) {
      console.warn('Sync listener notice:', err);
    }
  }
}

/**
 * Check active network connectivity safely
 */
export async function isDeviceOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return !!(state && state.isConnected && state.isInternetReachable);
  } catch (err) {
    console.warn('Network connectivity check notice:', err);
    return false;
  }
}

/**
 * Synchronize all pending offline incidents with InsForge & YOLOv8
 * Never deletes local evidence if sync fails.
 */
export async function syncPendingIncidents(userId?: string | null): Promise<{
  syncedCount: number;
  failedCount: number;
  errors: string[];
}> {
  if (isSyncInProgress) {
    return { syncedCount: 0, failedCount: 0, errors: ['Sync already in progress'] };
  }

  try {
    const online = await isDeviceOnline();
    if (!online) {
      notifySyncListeners('OFFLINE EMERGENCY MODE', false);
      return { syncedCount: 0, failedCount: 0, errors: ['Device is offline'] };
    }

    isSyncInProgress = true;
    notifySyncListeners('Connection restored. Syncing emergency incidents...', true);

    const errors: string[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    const allIncidents = await getOfflineIncidents();
    const pending = allIncidents.filter((i) => i.is_synced === 0);

    if (pending.length === 0) {
      notifySyncListeners('All emergency incidents synced successfully.', false);
      isSyncInProgress = false;
      return { syncedCount: 0, failedCount: 0, errors: [] };
    }

    for (const item of pending) {
      try {
        const isPhotoCapture = item.local_image_path && item.local_image_path.startsWith('file://');

        if (isPhotoCapture) {
          notifySyncListeners(`Uploading evidence ${item.id} to InsForge...`, true);

          // Step 1: Upload image to InsForge Storage bucket crack-images
          const uploadRes = await uploadImageToStorage('crack-images', item.local_image_path);
          if (!uploadRes.url) {
            throw new Error(uploadRes.error || 'Failed to upload photo to InsForge storage');
          }
          const cloudImageUrl = uploadRes.url;

          // Step 2: Run real YOLOv8 AI inference
          notifySyncListeners(`Running YOLOv8 inference for ${item.id}...`, true);
          const { result: yoloResult, error: yoloError } = await detectCracksWithYOLO(
            item.local_image_path
          );

          if (yoloError || !yoloResult) {
            throw new Error(yoloError || 'YOLOv8 AI inference failed');
          }

          // Step 3: Write confirmed inspection into InsForge database
          notifySyncListeners(`Persisting inspection record for ${item.id}...`, true);
          const recommendation =
            yoloResult.severity === 'CRITICAL'
              ? 'Immediate professional structural inspection recommended.'
              : yoloResult.severity === 'MEDIUM'
              ? 'Professional structural inspection recommended.'
              : 'Monitor periodically.';

          const { data: inspData, error: dbError } = await saveInspectionRecord({
            user_id: userId || null,
            original_image_url: cloudImageUrl,
            detection_image_url: cloudImageUrl,
            latitude: item.latitude,
            longitude: item.longitude,
            location_status: item.latitude && item.longitude ? 'EXACT' : 'OFFLINE',
            confidence: yoloResult.confidence,
            crack_count: yoloResult.crackCount,
            detections_json: yoloResult.detections,
            dimensions: yoloResult.detections[0]?.dimensions || item.dimensions,
            severity: yoloResult.severity,
            recommendation: recommendation,
            mode: 'OFFLINE'
          });

          if (dbError || !inspData) {
            throw new Error(dbError || 'Failed to write inspection to InsForge database');
          }

          // Step 4: If CRITICAL, trigger emergency alert in InsForge
          if (yoloResult.severity === 'CRITICAL') {
            notifySyncListeners(`Broadcasting emergency incident for ${item.id}...`, true);
            await triggerEmergencySOS({
              inspection_id: inspData.id,
              user_id: userId || null,
              latitude: item.latitude || 0,
              longitude: item.longitude || 0,
              severity: 'CRITICAL',
              confidence: yoloResult.confidence,
              sos_status: 'TRIGGERED',
              synced_from_offline: true
            });
          }

          // Step 5: Mark synced in SQLite
          await markIncidentSynced(item.id, {
            severity: yoloResult.severity,
            confidence: yoloResult.confidence,
            crackCount: yoloResult.crackCount,
            dimensions: yoloResult.detections[0]?.dimensions || item.dimensions,
            detectionsJson: JSON.stringify(yoloResult.detections)
          });
        } else {
          // Beacon incident (e.g. 1-Tap SOS without camera capture)
          notifySyncListeners(`Broadcasting offline beacon incident ${item.id}...`, true);

          const { data: inspData, error: dbError } = await saveInspectionRecord({
            user_id: userId || null,
            original_image_url: 'emergency_sos_beacon',
            detection_image_url: 'emergency_sos_beacon',
            latitude: item.latitude,
            longitude: item.longitude,
            location_status: item.latitude && item.longitude ? 'EXACT' : 'OFFLINE',
            confidence: 0.99,
            crack_count: 1,
            detections_json: [
              {
                bbox: [0, 0, 100, 100],
                confidence: 0.99,
                dimensions: 'Emergency Hazard Beacon'
              }
            ],
            dimensions: 'Emergency Hazard Beacon',
            severity: 'CRITICAL',
            recommendation: 'Immediate professional structural inspection recommended.',
            mode: 'OFFLINE'
          });

          if (dbError || !inspData) {
            throw new Error(dbError || 'Failed to write beacon inspection');
          }

          await triggerEmergencySOS({
            inspection_id: inspData.id,
            user_id: userId || null,
            latitude: item.latitude || 0,
            longitude: item.longitude || 0,
            severity: 'CRITICAL',
            confidence: 0.99,
            sos_status: 'TRIGGERED',
            synced_from_offline: true
          });

          await markIncidentSynced(item.id, {
            severity: 'CRITICAL',
            confidence: 0.99,
            crackCount: 1,
            dimensions: 'Emergency Hazard Beacon'
          });
        }

        syncedCount++;
      } catch (err) {
        failedCount++;
        const msg = err instanceof Error ? err.message : 'Sync failure';
        errors.push(`${item.id}: ${msg}`);
        await updateIncidentStatus(item.id, 'Sync failed – Retry');
      }
    }

    if (failedCount > 0) {
      notifySyncListeners('Sync failed – Retry', false);
    } else {
      notifySyncListeners('All emergency incidents synced successfully.', false);
    }

    return { syncedCount, failedCount, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync loop error';
    notifySyncListeners('Sync failed – Retry', false);
    return { syncedCount: 0, failedCount: 1, errors: [msg] };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Initializes background network watcher for automatic sync on reconnection
 */
export function startNetworkAutoSyncWatcher(userId?: string | null): () => void {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
  }
  if (networkSubscription) {
    networkSubscription.remove();
    networkSubscription = null;
  }

  const handleConnectivityChange = async (isOnline: boolean) => {
    try {
      if (lastKnownOnlineState === false && isOnline === true) {
        console.log('Connection restored. Automatically syncing pending emergency incidents...');
        notifySyncListeners('Connection restored. Syncing emergency incidents...', true);
        await syncPendingIncidents(userId);
      } else if (!isOnline) {
        notifySyncListeners('OFFLINE EMERGENCY MODE', false);
      }
      lastKnownOnlineState = isOnline;
    } catch (err) {
      console.warn('handleConnectivityChange notice:', err);
    }
  };

  try {
    networkSubscription = Network.addNetworkStateListener((state) => {
      const isOnline = !!(state && state.isConnected && state.isInternetReachable);
      handleConnectivityChange(isOnline);
    });
  } catch (err) {
    console.warn('Network state listener notice:', err);
  }

  watcherInterval = setInterval(async () => {
    try {
      const isOnline = await isDeviceOnline();
      await handleConnectivityChange(isOnline);
    } catch (err) {
      console.warn('Network monitor poll notice:', err);
    }
  }, 5000);

  return () => {
    if (watcherInterval) {
      clearInterval(watcherInterval);
      watcherInterval = null;
    }
    if (networkSubscription) {
      networkSubscription.remove();
      networkSubscription = null;
    }
  };
}
