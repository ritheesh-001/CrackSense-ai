import React, { useState } from 'react';
import type { Inspection, SeverityLevel } from '../types';
import { generateInspectionPdfReport } from '../utils/reportPdf';
import {
  AlertTriangle,
  Download,
  Eye,
  FileSpreadsheet,
  MapPin,
  Search,
  Wifi,
  WifiOff
} from 'lucide-react';

interface Props {
  inspections: Inspection[];
  onSelectInspection: (inspection: Inspection) => void;
}

export const InspectionsTable: React.FC<Props> = ({
  inspections,
  onSelectInspection
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | SeverityLevel>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [exportingId, setExportingId] = useState<string | null>(null);

  const filtered = inspections.filter((insp) => {
    // Search
    const matchesSearch =
      insp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (insp.recommendation && insp.recommendation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (insp.dimensions && insp.dimensions.toLowerCase().includes(searchTerm.toLowerCase()));

    // Severity
    const matchesSeverity = severityFilter === 'ALL' || insp.severity === severityFilter;

    // Mode
    const matchesMode = modeFilter === 'ALL' || insp.mode === modeFilter;

    return matchesSearch && matchesSeverity && matchesMode;
  });

  const handleDownloadSinglePdf = async (e: React.MouseEvent, inspection: Inspection) => {
    e.stopPropagation();
    setExportingId(inspection.id);
    try {
      await generateInspectionPdfReport(inspection);
    } catch (err) {
      console.warn('PDF download notice:', err);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header & Filter Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Synced Field Inspection Log
            </h2>
            <p className="text-[11px] text-slate-400">
              Showing {filtered.length} of {inspections.length} recorded structural audits
            </p>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, damage, dims..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44 md:w-56"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as 'ALL' | SeverityLevel)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 font-semibold"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>

          {/* Mode Filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as 'ALL' | 'ONLINE' | 'OFFLINE')}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 font-semibold"
          >
            <option value="ALL">All Modes</option>
            <option value="ONLINE">Online Realtime</option>
            <option value="OFFLINE">Offline Synced</option>
          </select>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Inspection</th>
              <th className="py-3 px-4">Mode</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">AI Confidence</th>
              <th className="py-3 px-4">Cracks & Dims</th>
              <th className="py-3 px-4">GPS Telemetry</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-400">No inspections found matching criteria</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Try adjusting your search keywords or severity filters
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isCrit = item.severity === 'CRITICAL';
                const isMed = item.severity === 'MEDIUM';
                const hasLoc = item.latitude !== null && item.longitude !== null;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectInspection(item)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    {/* Thumbnail & ID */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 flex items-center justify-center">
                          {item.original_image_url && !item.original_image_url.startsWith('emergency_sos_beacon') ? (
                            <img
                              src={item.original_image_url}
                              alt="thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-mono font-bold text-slate-200 group-hover:text-sky-400 transition-colors">
                            #{item.id.substring(0, 8)}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {item.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mode */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.mode === 'OFFLINE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {item.mode === 'OFFLINE' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                        <span>{item.mode}</span>
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          isCrit
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                            : isMed
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>

                    {/* AI Confidence */}
                    <td className="py-3 px-4">
                      <div className="w-24">
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-200">{Math.round(item.confidence * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isCrit ? 'bg-red-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.round(item.confidence * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Cracks & Dimensions */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200">
                        {item.crack_count} crack(s)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.dimensions || 'N/A'}
                      </div>
                    </td>

                    {/* GPS Coordinates */}
                    <td className="py-3 px-4">
                      {hasLoc ? (
                        <div className="flex items-center space-x-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-sky-400 flex-shrink-0" />
                          <span>{item.latitude!.toFixed(4)}, {item.longitude!.toFixed(4)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Location unavailable</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-400">
                      <div>{new Date(item.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onSelectInspection(item)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-colors"
                          title="View Full Inspection Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleDownloadSinglePdf(e, item)}
                          disabled={exportingId === item.id}
                          className="p-1.5 bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white rounded-md transition-colors"
                          title="Download PDF Inspection Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
