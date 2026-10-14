import React from 'react';
import type { EmergencyIncident } from '../types';
import { updateEmergencyIncidentStatus } from '../services/insforge';
import { stopHazardAlarm } from '../utils/audioAlert';
import {
  AlertOctagon,
  Check,
  MapPin,
  Send,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Props {
  activeIncidents: EmergencyIncident[];
  onIncidentUpdated: () => void;
  onLocateIncident: (incident: EmergencyIncident) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const EmergencyAlertBanner: React.FC<Props> = ({
  activeIncidents,
  onIncidentUpdated,
  onLocateIncident,
  isMuted,
  onToggleMute
}) => {
  const triggered = activeIncidents.filter((i) => i.sos_status === 'TRIGGERED');

  if (triggered.length === 0) {
    return null;
  }

  const primaryIncident = triggered[0];
  const hasCoords = primaryIncident.latitude !== 0 && primaryIncident.longitude !== 0;

  const handleAcknowledge = async () => {
    stopHazardAlarm();
    await updateEmergencyIncidentStatus(primaryIncident.id, 'ACKNOWLEDGED');
    onIncidentUpdated();
  };

  const handleDispatch = async () => {
    stopHazardAlarm();
    await updateEmergencyIncidentStatus(primaryIncident.id, 'DISPATCHED');
    onIncidentUpdated();
  };

  return (
    <div className="w-full bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white shadow-2xl border-b-2 border-red-400 z-40 animate-pulse-fast">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Glowing Alarm Icon & Telemetry */}
        <div className="flex items-center space-x-3.5">
          <div className="p-2 bg-white/20 rounded-xl shadow-inner flex items-center justify-center animate-bounce">
            <AlertOctagon className="w-6 h-6 text-white" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded text-white">
                PRIORITY 1 DISPATCH
              </span>
              <span className="text-xs font-extrabold tracking-wide">
                CRITICAL STRUCTURAL HAZARD DETECTED ({triggered.length} Active SOS)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-red-100 mt-0.5">
              <span>Incident: <strong>#{primaryIncident.id.substring(0, 8)}</strong></span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {hasCoords
                    ? `${primaryIncident.latitude.toFixed(5)}, ${primaryIncident.longitude.toFixed(5)}`
                    : 'Location unavailable'}
                </span>
              </span>
              <span>•</span>
              <span>Confidence: <strong>{Math.round(primaryIncident.confidence * 100)}%</strong></span>
              <span>•</span>
              <span>Time: <strong>{new Date(primaryIncident.created_at).toLocaleTimeString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center space-x-2">
          {hasCoords && (
            <button
              onClick={() => onLocateIncident(primaryIncident)}
              className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors border border-white/20"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>LOCATE</span>
            </button>
          )}

          <button
            onClick={handleAcknowledge}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors border border-white/30"
          >
            <Check className="w-3.5 h-3.5" />
            <span>ACKNOWLEDGE</span>
          </button>

          <button
            onClick={handleDispatch}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-red-700 rounded-lg text-xs font-black flex items-center space-x-1.5 transition-transform active:scale-95 shadow-lg shadow-black/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>DISPATCH ENGINEERS</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-lg transition-colors"
            title={isMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
