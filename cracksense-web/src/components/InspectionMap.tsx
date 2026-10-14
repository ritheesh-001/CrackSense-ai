import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Inspection, SeverityLevel } from '../types';
import { AlertTriangle, Layers } from 'lucide-react';

interface Props {
  inspections: Inspection[];
  onSelectInspection: (inspection: Inspection) => void;
  selectedInspectionId?: string | null;
}

export const InspectionMap: React.FC<Props> = ({
  inspections,
  onSelectInspection,
  selectedInspectionId
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [severityFilter, setSeverityFilter] = useState<'ALL' | SeverityLevel>('ALL');

  // Filter only inspections with valid GPS coordinates
  const geocodedInspections = inspections.filter(
    (item) => typeof item.latitude === 'number' && typeof item.longitude === 'number' && !isNaN(item.latitude) && !isNaN(item.longitude)
  );

  const filteredInspections = geocodedInspections.filter((item) => {
    if (severityFilter === 'ALL') return true;
    return item.severity === severityFilter;
  });

  const criticalCount = geocodedInspections.filter((i) => i.severity === 'CRITICAL').length;
  const mediumCount = geocodedInspections.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount = geocodedInspections.filter((i) => i.severity === 'LOW').length;
  const unlocatedCount = inspections.length - geocodedInspections.length;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: First geocoded location, or civil infrastructure center
      const initialCenter: [number, number] = geocodedInspections.length > 0
        ? [geocodedInspections[0].latitude!, geocodedInspections[0].longitude!]
        : [37.7749, -122.4194];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: false
      });

      // CartoDB Dark Matter / Midnight tiles for sleek modern Command Center look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when inspections or filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    const bounds: [number, number][] = [];

    filteredInspections.forEach((insp) => {
      const lat = insp.latitude!;
      const lng = insp.longitude!;
      bounds.push([lat, lng]);

      // Color coding & icon based on severity
      const isCritical = insp.severity === 'CRITICAL';
      const isMedium = insp.severity === 'MEDIUM';
      const isSelected = insp.id === selectedInspectionId;

      const bgColor = isCritical ? '#dc2626' : isMedium ? '#d97706' : '#10b981';
      const borderColor = isCritical ? '#fee2e2' : isMedium ? '#fef3c7' : '#d1fae5';
      const markerSize = isSelected ? 38 : isCritical ? 34 : 28;

      // Custom HTML Marker Pin
      const iconHtml = `
        <div class="${isCritical ? 'pulsing-hazard-marker' : ''}" style="
          width: ${markerSize}px;
          height: ${markerSize}px;
          border-radius: 50%;
          background: ${bgColor};
          border: 3px solid ${borderColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: ${isCritical ? '13px' : '11px'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          cursor: pointer;
          transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          transition: transform 0.2s ease;
        ">
          ${isCritical ? '⚠' : insp.crack_count}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-map-pin',
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Interactive Popup with telemetry and thumbnail
      const popupHtml = `
        <div style="font-family: sans-serif; width: 230px; color: #0f172a;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 800; font-size: 11px; color: #64748b;">AUDIT #${insp.id.substring(0, 10)}</span>
            <span style="
              padding: 2px 8px;
              border-radius: 4px;
              font-weight: 800;
              font-size: 10px;
              text-transform: uppercase;
              background: ${isCritical ? '#fee2e2' : isMedium ? '#fef3c7' : '#dcfce7'};
              color: ${isCritical ? '#dc2626' : isMedium ? '#b45309' : '#15803d'};
            ">${insp.severity}</span>
          </div>

          ${
            insp.original_image_url && !insp.original_image_url.startsWith('emergency_sos_beacon')
              ? `<div style="width: 100%; height: 110px; border-radius: 6px; overflow: hidden; margin-bottom: 8px; background: #000;">
                  <img src="${insp.original_image_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Crack capture" />
                </div>`
              : ''
          }

          <div style="font-size: 12px; line-height: 1.5; margin-bottom: 10px; color: #334155;">
            <div><strong>Cracks:</strong> ${insp.crack_count} fissure(s)</div>
            <div><strong>Dimensions:</strong> ${insp.dimensions || 'N/A'}</div>
            <div><strong>Confidence:</strong> ${Math.round(insp.confidence * 100)}%</div>
            <div><strong>GPS:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
          </div>

          <button id="view-btn-${insp.id}" style="
            width: 100%;
            padding: 8px 12px;
            background: #0284c7;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            letter-spacing: 0.5px;
          ">INSPECT FULL DOSSIER</button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-btn-${insp.id}`);
        if (btn) {
          btn.onclick = () => onSelectInspection(insp);
        }
      });

      marker.addTo(markersGroup);
    });

    // Auto-fit bounds if markers exist
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }
  }, [filteredInspections.length, severityFilter, selectedInspectionId]);

  const handleFocusCritical = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const criticals = geocodedInspections.filter((i) => i.severity === 'CRITICAL');
    if (criticals.length === 0) return;

    const bounds = criticals.map((i) => [i.latitude!, i.longitude!] as [number, number]);
    if (bounds.length === 1) {
      map.setView(bounds[0], 16);
    } else {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    }
    setSeverityFilter('CRITICAL');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Map Header Controls */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              GIS Telemetry Heatmap & GPS Pins
            </h2>
            <p className="text-[11px] text-slate-400">
              {geocodedInspections.length} geocoded sites active • {unlocatedCount} pending GPS lock
            </p>
          </div>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 border border-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
              severityFilter === 'ALL'
                ? 'bg-slate-800 text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ALL ({geocodedInspections.length})
          </button>
          <button
            onClick={() => setSeverityFilter('CRITICAL')}
            className={`px-2.5 py-1 rounded-md font-bold flex items-center space-x-1 transition-all ${
              severityFilter === 'CRITICAL'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'text-slate-400 hover:text-red-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>CRITICAL ({criticalCount})</span>
          </button>
          <button
            onClick={() => setSeverityFilter('MEDIUM')}
            className={`px-2.5 py-1 rounded-md font-bold flex items-center space-x-1 transition-all ${
              severityFilter === 'MEDIUM'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>MEDIUM ({mediumCount})</span>
          </button>
          <button
            onClick={() => setSeverityFilter('LOW')}
            className={`px-2.5 py-1 rounded-md font-bold flex items-center space-x-1 transition-all ${
              severityFilter === 'LOW'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>LOW ({lowCount})</span>
          </button>
        </div>

        {/* Quick Action */}
        {criticalCount > 0 && (
          <button
            onClick={handleFocusCritical}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-red-900/40 transition-transform active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>FOCUS HAZARDS ({criticalCount})</span>
          </button>
        )}
      </div>

      {/* Map Viewport Container */}
      <div className="relative flex-1 w-full min-h-[380px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

        {/* Floating Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 border border-slate-800 rounded-xl shadow-xl text-[11px] text-slate-300 pointer-events-auto">
          <div className="font-bold text-slate-200 mb-1.5 tracking-wider uppercase">Pin Legend</div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-600 border border-red-300"></span>
              <span>Critical Structural Rupture</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-200"></span>
              <span>Moderate Fissure (Professional Inspection)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-200"></span>
              <span>Minor / Periodic Monitor</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
