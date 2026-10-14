export type SeverityLevel = 'LOW' | 'MEDIUM' | 'CRITICAL' | 'NONE';
export type InspectionMode = 'ONLINE' | 'OFFLINE' | 'BATCH';
export type LocationStatus = 'ONLINE' | 'OFFLINE' | 'ESTIMATED' | 'EXACT';
export type SOSStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED' | 'FALSE_ALARM';
export type UserRole = 'Inspector' | 'Authority' | 'Admin';

export interface DetectionItem {
  bbox: [number, number, number, number];
  confidence: number;
  dimensions: string;
}

export interface Inspection {
  id: string;
  user_id?: string | null;
  original_image_url: string;
  detection_image_url?: string | null;
  latitude: number | null;
  longitude: number | null;
  location_status: LocationStatus;
  confidence: number;
  crack_count: number;
  detections_json: DetectionItem[];
  dimensions?: string | null;
  severity: SeverityLevel;
  recommendation?: string | null;
  mode: InspectionMode;
  created_at: string;
  updated_at?: string;
}

export interface EmergencyIncident {
  id: string;
  inspection_id?: string | null;
  user_id?: string | null;
  latitude: number;
  longitude: number;
  severity: SeverityLevel;
  confidence: number;
  sos_status: SOSStatus;
  synced_from_offline: boolean;
  created_at: string;
  updated_at?: string;
}
