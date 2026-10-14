import React, { useState } from 'react';
import type { Inspection } from '../types';
import { generateInspectionPdfReport } from '../utils/reportPdf';
import {
  AlertTriangle,
  Calendar,
  Crosshair,
  Download,
  ExternalLink,
  MapPin,
  Ruler,
  ShieldCheck,
  X
} from 'lucide-react';

interface Props {
  inspection: Inspection;
  onClose: () => void;
}

export const InspectionDetailModal: React.FC<Props> = ({ inspection, onClose }) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);

  const isCritical = inspection.severity === 'CRITICAL';
  const isMedium = inspection.severity === 'MEDIUM';
  const hasCoords = inspection.latitude !== null && inspection.longitude !== null;

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await generateInspectionPdfReport(inspection);
    } catch (err) {
      console.warn('PDF generation error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const detections = Array.isArray(inspection.detections_json)
    ? inspection.detections_json
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 text-xs font-black uppercase rounded-md tracking-wider ${
                isCritical
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                  : isMedium
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {inspection.severity} HAZARD
            </span>
            <span className="text-xs font-mono text-slate-400">ID: {inspection.id}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-sky-900/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingPdf ? 'COMPILING PDF...' : 'DOWNLOAD PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Left: Image Canvas with Bounding Boxes */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Crosshair className="w-4 h-4 text-sky-400" />
                <span>Neural Detection Frame</span>
              </span>

              {detections.length > 0 && (
                <button
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className={`text-[11px] px-2 py-0.5 rounded font-bold border transition-colors ${
                    showBoundingBoxes
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {showBoundingBoxes ? 'HIDE BOXES' : 'SHOW BOXES'}
                </button>
              )}
            </div>

            <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
              {inspection.original_image_url && !inspection.original_image_url.startsWith('emergency_sos_beacon') ? (
                <>
                  <img
                    src={inspection.original_image_url}
                    alt="Inspection frame"
                    className="w-full h-full object-cover"
                  />

                  {/* Visual Bounding Boxes overlay */}
                  {showBoundingBoxes && detections.length > 0 && (
                    <svg
                      viewBox="0 0 640 640"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      {detections.map((det, idx) => {
                        const [x1, y1, x2, y2] = det.bbox;
                        const w = Math.max(10, x2 - x1);
                        const h = Math.max(10, y2 - y1);
                        return (
                          <g key={idx}>
                            <rect
                              x={x1}
                              y={y1}
                              width={w}
                              height={h}
                              fill="rgba(239, 68, 68, 0.2)"
                              stroke={isCritical ? '#ef4444' : '#f59e0b'}
                              strokeWidth="3"
                              strokeDasharray="4 2"
                            />
                            <rect
                              x={x1}
                              y={Math.max(0, y1 - 20)}
                              width={110}
                              height={18}
                              fill={isCritical ? '#dc2626' : '#d97706'}
                              rx="3"
                            />
                            <text
                              x={x1 + 4}
                              y={Math.max(12, y1 - 6)}
                              fill="#ffffff"
                              fontSize="11"
                              fontWeight="bold"
                            >
                              Crack {Math.round(det.confidence * 100)}%
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
                  <AlertTriangle className="w-12 h-12 text-red-500 mb-2 animate-bounce" />
                  <span className="text-sm font-bold text-slate-300">1-TAP EMERGENCY SOS BEACON</span>
                  <span className="text-xs text-slate-500 mt-1">
                    Direct instant hazard signal transmitted from mobile unit
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span>Mode: <strong>{inspection.mode}</strong></span>
              <span>Detections: <strong>{inspection.crack_count} crack(s)</strong></span>
              <span>Confidence: <strong>{Math.round(inspection.confidence * 100)}%</strong></span>
            </div>
          </div>

          {/* Right: Inspection Telemetry Dossier */}
          <div className="flex flex-col space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">
                Civil Engineering Telemetry
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Audit Timestamp:</span>
                  </span>
                  <span className="font-semibold text-slate-200">
                    {new Date(inspection.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>GPS Coordinates:</span>
                  </span>
                  <span className="font-semibold text-slate-200 flex items-center space-x-1">
                    {hasCoords ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${inspection.latitude},${inspection.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:underline flex items-center space-x-1"
                      >
                        <span>{inspection.latitude!.toFixed(6)}, {inspection.longitude!.toFixed(6)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-amber-400">Location unavailable</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Measured Dimensions:</span>
                  </span>
                  <span className="font-bold text-slate-200">
                    {inspection.dimensions || 'Pending measurement'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Location Status:</span>
                  <span className="font-semibold text-slate-200">
                    {inspection.location_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Mandated Action Box */}
            <div
              className={`p-3.5 rounded-xl border ${
                isCritical
                  ? 'bg-red-500/10 border-red-500/30 text-red-200'
                  : isMedium
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}
            >
              <div className="text-xs font-black uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Mandated Engineering Action</span>
              </div>
              <p className="text-xs font-semibold leading-relaxed">
                {inspection.recommendation || 'Standard civil engineering monitoring advised.'}
              </p>
            </div>

            {/* Mandatory Regulatory Disclaimer */}
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 text-[11px] text-sky-200 leading-relaxed">
              <strong className="block text-sky-400 mb-0.5">AI-based preliminary risk assessment</strong>
              This visual machine-learning assessment identifies preliminary crack geometry and structural defect markers. Automated analysis does not certify complete building safety; official on-site civil engineering inspections remain authoritative.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
