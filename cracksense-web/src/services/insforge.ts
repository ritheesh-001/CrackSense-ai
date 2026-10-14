import { createClient } from '@insforge/sdk';
import type { EmergencyIncident, Inspection, SOSStatus } from '../types';

const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL || 'https://749ge7kb.us-east.insforge.app';
const INSFORGE_ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY || 'ik_4fbc67163fb91c2070969f7b51ce1aab';

export const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY
});

/**
 * Fetch all synced crack inspections from InsForge PostgreSQL
 */
export async function fetchInspectionsList(limit = 100): Promise<{
  inspections: Inspection[];
  error: string | null;
}> {
  try {
    const { data, error } = await insforge.database
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { inspections: [], error: error.message || 'Database query error' };
    }

    return { inspections: (data as Inspection[]) || [], error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve inspections';
    return { inspections: [], error: msg };
  }
}

/**
 * Fetch all active and recent emergency SOS alerts from InsForge
 */
export async function fetchEmergencyIncidentsList(limit = 50): Promise<{
  incidents: EmergencyIncident[];
  error: string | null;
}> {
  try {
    const { data, error } = await insforge.database
      .from('emergency_incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { incidents: [], error: error.message || 'Database query error' };
    }

    return { incidents: (data as EmergencyIncident[]) || [], error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve emergency incidents';
    return { incidents: [], error: msg };
  }
}

/**
 * Update the dispatch / acknowledgment status of an emergency SOS incident
 */
export async function updateEmergencyIncidentStatus(
  id: string,
  newStatus: SOSStatus
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await insforge.database
      .from('emergency_incidents')
      .update({
        sos_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message || 'Update failed' };
    }

    return { success: true, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update emergency status';
    return { success: false, error: msg };
  }
}

/**
 * Live watcher for incoming CRITICAL SOS alerts.
 * Polling combined with realtime channel ensures immediate reception.
 */
export function subscribeToLiveEmergencyIncidents(
  onNewTriggeredIncident: (incident: EmergencyIncident) => void,
  intervalMs = 4000
): () => void {
  let isWatching = true;
  let seenIncidentIds = new Set<string>();
  let isFirstRun = true;

  const pollIncidents = async () => {
    if (!isWatching) return;
    try {
      const { incidents } = await fetchEmergencyIncidentsList(20);
      if (isFirstRun) {
        incidents.forEach((i) => seenIncidentIds.add(i.id));
        isFirstRun = false;
        return;
      }

      for (const incident of incidents) {
        if (!seenIncidentIds.has(incident.id)) {
          seenIncidentIds.add(incident.id);
          if (incident.severity === 'CRITICAL' && incident.sos_status === 'TRIGGERED') {
            onNewTriggeredIncident(incident);
          }
        }
      }
    } catch (err) {
      console.warn('Live incident watcher notice:', err);
    }
  };

  pollIncidents();
  const timer = setInterval(pollIncidents, intervalMs);

  return () => {
    isWatching = false;
    clearInterval(timer);
  };
}
