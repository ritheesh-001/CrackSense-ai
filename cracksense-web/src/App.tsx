import { useEffect, useState } from 'react';
import type { EmergencyIncident, Inspection } from './types';
import {
  fetchEmergencyIncidentsList,
  fetchInspectionsList,
  subscribeToLiveEmergencyIncidents,
  updateEmergencyIncidentStatus
} from './services/insforge';
import {
  initAudioContext,
  isAudioMuted,
  playChimeTone,
  playHazardAlarm,
  setAudioMuted,
  stopHazardAlarm
} from './utils/audioAlert';
import { EmergencyAlertBanner } from './components/EmergencyAlertBanner';
import { InspectionMap } from './components/InspectionMap';
import { InspectionsTable } from './components/InspectionsTable';
import { InspectionDetailModal } from './components/InspectionDetailModal';
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCircle,
  Flame,
  Globe,
  HardHat,
  MapPin,
  Radio,
  RefreshCw,
  Send,
  Volume2,
  VolumeX
} from 'lucide-react';

export function App() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [emergencyIncidents, setEmergencyIncidents] = useState<EmergencyIncident[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [audioMuted, setAudioMutedState] = useState(isAudioMuted());

  // Load Initial Data
  const loadDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [inspRes, emRes] = await Promise.all([
        fetchInspectionsList(100),
        fetchEmergencyIncidentsList(50)
      ]);

      if (inspRes.error) {
        setErrorMsg(`Inspections query error: ${inspRes.error}`);
      } else {
        setInspections(inspRes.inspections);
      }

      if (emRes.error) {
        console.warn('Emergency incidents query notice:', emRes.error);
      } else {
        setEmergencyIncidents(emRes.incidents);

        // If any incident is newly TRIGGERED, trigger sound
        const hasTriggered = emRes.incidents.some(
          (i) => i.severity === 'CRITICAL' && i.sos_status === 'TRIGGERED'
        );
        if (hasTriggered && !audioMuted) {
          playHazardAlarm();
        }
      }
    } catch (err) {
      setErrorMsg('Failed to establish link with InsForge BaaS backend.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Subscribe to live incoming emergency incidents from mobile devices
    const unsubscribe = subscribeToLiveEmergencyIncidents((newIncident) => {
      console.log('LIVE SOS DISPATCH RECEIVED:', newIncident);
      playHazardAlarm();
      loadDashboardData();
    });

    return () => {
      unsubscribe();
      stopHazardAlarm();
    };
  }, [audioMuted]);

  const handleToggleMute = () => {
    initAudioContext();
    const nextMuted = !audioMuted;
    setAudioMuted(nextMuted);
    setAudioMutedState(nextMuted);
  };

  const handleTestSiren = () => {
    initAudioContext();
    if (audioMuted) {
      setAudioMuted(false);
      setAudioMutedState(false);
    }
    playChimeTone(880, 0.3);
    setTimeout(() => playChimeTone(660, 0.4), 280);
  };

  const handleLocateIncidentOnMap = (incident: EmergencyIncident) => {
    // If associated inspection exists, select it
    if (incident.inspection_id) {
      const found = inspections.find((i) => i.id === incident.inspection_id);
      if (found) {
        setSelectedInspection(found);
      }
    }
  };

  const handleUpdateStatus = async (id: string, status: 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED') => {
    stopHazardAlarm();
    await updateEmergencyIncidentStatus(id, status);
    loadDashboardData();
  };

  // Metrics
  const criticalHazards = inspections.filter((i) => i.severity === 'CRITICAL').length;
  const mediumHazards = inspections.filter((i) => i.severity === 'MEDIUM').length;
  const lowHazards = inspections.filter((i) => i.severity === 'LOW').length;
  const activeSOS = emergencyIncidents.filter((i) => i.sos_status === 'TRIGGERED').length;
  const dispatchedSOS = emergencyIncidents.filter((i) => i.sos_status === 'DISPATCHED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. Top Emergency Alert Banner (Audio/Visual warning for incoming CRITICAL SOS) */}
      <EmergencyAlertBanner
        activeIncidents={emergencyIncidents}
        onIncidentUpdated={loadDashboardData}
        onLocateIncident={handleLocateIncidentOnMap}
        isMuted={audioMuted}
        onToggleMute={handleToggleMute}
      />

      {/* 2. Command Center Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-sky-500 to-cyan-400 p-0.5 shadow-lg shadow-sky-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold tracking-wide text-white font-heading">
                  CRACKSENSE AI
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  AUTHORITY HUB
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Municipal Civil Infrastructure & Structural Health Command Center
              </p>
            </div>
          </div>

          {/* Telemetry Status & Header Actions */}
          <div className="flex items-center space-x-2.5">
            {/* Live Backend Connection Indicator */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-slate-300">InsForge BaaS Live</span>
            </div>

            {/* Test Alarm Sound */}
            <button
              onClick={handleTestSiren}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5"
              title="Test Emergency Audio Siren Tone"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden md:inline">TEST SIREN</span>
            </button>

            {/* Mute/Unmute Audio */}
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-lg border transition-colors ${
                audioMuted
                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
              }`}
              title={audioMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Refresh */}
            <button
              onClick={loadDashboardData}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-sky-900/30 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">REFRESH</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error notification banner if query error occurs */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-white font-bold ml-2"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Initial Loading State */}
        {isLoading && inspections.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-400 mb-2" />
            <span className="text-sm font-bold">Connecting to InsForge BaaS & Loading Audits...</span>
          </div>
        )}

        {/* KPI Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Total Inspections */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-lg flex items-center space-x-3.5">
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Audited Structures
              </div>
              <div className="text-2xl font-black text-white font-heading">
                {inspections.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {lowHazards} baseline • Synced field reports
              </div>
            </div>
          </div>

          {/* Card 2: Critical Structural Hazards */}
          <div className="bg-slate-900/90 border border-red-500/30 rounded-xl p-4 shadow-lg flex items-center space-x-3.5 bg-gradient-to-br from-red-950/20 to-transparent">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center space-x-1">
                <span>Critical Hazards</span>
                {activeSOS > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                )}
              </div>
              <div className="text-2xl font-black text-red-400 font-heading">
                {criticalHazards}
              </div>
              <div className="text-[10px] text-red-300/70 mt-0.5">
                {activeSOS} Active SOS • Immediate Cordon
              </div>
            </div>
          </div>

          {/* Card 3: Medium Advisories */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-lg flex items-center space-x-3.5">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Moderate Fissures
              </div>
              <div className="text-2xl font-black text-amber-300 font-heading">
                {mediumHazards}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Professional check advised
              </div>
            </div>
          </div>

          {/* Card 4: Dispatched Responders */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-lg flex items-center space-x-3.5">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Engineering Units
              </div>
              <div className="text-2xl font-black text-emerald-300 font-heading">
                {dispatchedSOS}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Active municipal dispatches
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Map & Emergency Incident Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive GIS Heatmap & Pins (2 Columns on large screens) */}
          <div className="lg:col-span-2 min-h-[460px] flex flex-col">
            <InspectionMap
              inspections={inspections}
              onSelectInspection={(insp) => setSelectedInspection(insp)}
              selectedInspectionId={selectedInspection?.id}
            />
          </div>

          {/* Live Emergency SOS Incident Feed (1 Column) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Emergency Feed
                </h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-bold">
                {emergencyIncidents.length} Logged
              </span>
            </div>

            <div className="p-3 overflow-y-auto max-h-[400px] space-y-2.5">
              {emergencyIncidents.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <CheckCircle className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400">No Emergency SOS Signals Active</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    System scanning mobile network feeds
                  </p>
                </div>
              ) : (
                emergencyIncidents.map((incident) => {
                  const isTriggered = incident.sos_status === 'TRIGGERED';
                  const isDispatched = incident.sos_status === 'DISPATCHED';
                  const hasLoc = incident.latitude !== 0 && incident.longitude !== 0;

                  return (
                    <div
                      key={incident.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isTriggered
                          ? 'bg-red-950/30 border-red-500/50 shadow-md shadow-red-950/20'
                          : isDispatched
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-slate-950/40 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-300">
                          #{incident.id.substring(0, 8)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isTriggered
                              ? 'bg-red-500 text-white animate-pulse'
                              : isDispatched
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {incident.sos_status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 space-y-0.5">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-sky-400" />
                          <span>
                            {hasLoc
                              ? `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`
                              : 'Location unavailable'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Logged: {new Date(incident.created_at).toLocaleTimeString()} • Confidence: {Math.round(incident.confidence * 100)}%
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-end space-x-1.5">
                        {isTriggered && (
                          <button
                            onClick={() => handleUpdateStatus(incident.id, 'DISPATCHED')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold flex items-center space-x-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>DISPATCH</span>
                          </button>
                        )}

                        {isDispatched && (
                          <button
                            onClick={() => handleUpdateStatus(incident.id, 'RESOLVED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center space-x-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>RESOLVE</span>
                          </button>
                        )}

                        {incident.inspection_id && (
                          <button
                            onClick={() => handleLocateIncidentOnMap(incident)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold"
                          >
                            VIEW
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 4. Synced Inspections Table */}
        <InspectionsTable
          inspections={inspections}
          onSelectInspection={(insp) => setSelectedInspection(insp)}
        />
      </main>

      {/* 5. Inspection Detail Modal with Bounding Boxes & Telemetry */}
      {selectedInspection && (
        <InspectionDetailModal
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            CrackSense AI • Authority Command Center • Connected to InsForge PostgreSQL
          </div>
          <div className="text-[11px] text-slate-400">
            Mandatory Disclaimer: <strong>AI-based preliminary risk assessment</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
