import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  MapPin,
  Package,
  Hash,
  Weight,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  getMachineStockLevel,
  getMachineTotalStockPcs,
  getMachineTotalStockKg,
  type Machine,
} from '../lib/dataHelpers';

// ─── Coordinate resolver ────────────────────────────────────────────────
// Uses lat/lng from the machine data model. Falls back to a hash-based
// position so newly created machines without coordinates still appear.

function getCoordinatesForMachine(machine: Machine): { lat: number; lng: number } {
  if (machine.lat != null && machine.lng != null) {
    return { lat: machine.lat, lng: machine.lng };
  }
  // Fallback: deterministic hash position in Cavite area
  let hash = 0;
  for (let i = 0; i < machine.id.length; i++) {
    hash = ((hash << 5) - hash) + machine.id.charCodeAt(i);
    hash |= 0;
  }
  const lat = 14.45 + (Math.abs(hash % 100) / 500);
  const lng = 120.85 + (Math.abs((hash >> 8) % 100) / 500);
  return { lat, lng };
}

// ─── Status config ──────────────────────────────────────────────────────

const STATUS_INFO: Record<string, { label: string; dot: string; markerColor: string }> = {
  online: { label: 'Online', dot: 'bg-green-500', markerColor: '#22c55e' },
  warning: { label: 'Warning', dot: 'bg-amber-500', markerColor: '#f59e0b' },
  offline: { label: 'Offline', dot: 'bg-gray-400', markerColor: '#9ca3af' },
};

// SVG marker icon by status
function createMarkerSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <filter id="s" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.25"/></filter>
    <path filter="url(#s)" d="M14 1C7.1 1 1.5 6.6 1.5 13.5c0 10 12.5 22.5 12.5 22.5s12.5-12.5 12.5-22.5C26.5 6.6 20.9 1 14 1z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="13.5" r="5.5" fill="white"/>
    <circle cx="14" cy="13.5" r="3" fill="${color}"/>
  </svg>`;
}

// ─── CDN Leaflet loader ─────────────────────────────────────────────────

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

let leafletLoadPromise: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    // Load CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    // Load JS
    if (!document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const script = document.createElement('script');
      script.src = LEAFLET_JS;
      script.onload = () => resolve((window as any).L);
      script.onerror = () => reject(new Error('Failed to load Leaflet'));
      document.head.appendChild(script);
    } else {
      // Script tag exists but L may not be ready yet
      const check = setInterval(() => {
        if ((window as any).L) {
          clearInterval(check);
          resolve((window as any).L);
        }
      }, 50);
      setTimeout(() => { clearInterval(check); reject(new Error('Leaflet load timeout')); }, 10000);
    }
  });

  return leafletLoadPromise;
}

// ─── Component ──────────────────────────────────────────────────────────

interface MachineMapProps {
  machines: Machine[];
  onSelectMachine: (machine: Machine) => void;
}

export function MachineMap({ machines, onSelectMachine }: MachineMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const mountedRef = useRef(true);
  const [leafletReady, setLeafletReady] = useState(!!(window as any).L);
  const [loadError, setLoadError] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load Leaflet
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => { if (!cancelled) setLeafletReady(true); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;

    const coords = machines.map(m => getCoordinatesForMachine(m));
    const avgLat = coords.length ? coords.reduce((s, c) => s + c.lat, 0) / coords.length : 14.5995;
    const avgLng = coords.length ? coords.reduce((s, c) => s + c.lng, 0) / coords.length : 120.9842;

    const map = L.map(mapContainerRef.current, {
      center: [avgLat, avgLng],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    // OpenStreetMap tiles (free, no API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Fit bounds – use animate: false to avoid classList error
    if (coords.length > 1) {
      const bounds = L.latLngBounds(coords.map((c: any) => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [40, 40], animate: false });
    } else if (coords.length === 1) {
      map.setView([coords[0].lat, coords[0].lng], 14, { animate: false });
    }

    return () => {
      mapInstanceRef.current = null;
      markersRef.current = [];
      try {
        map.off();
        map.remove();
      } catch {
        // Swallow errors during cleanup – container may already be gone
      }
    };
  }, [leafletReady]);

  // Update markers when machines change
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(m => {
      try { map.removeLayer(m); } catch { /* ignore */ }
    });
    markersRef.current = [];

    machines.forEach(machine => {
      const coords = getCoordinatesForMachine(machine);
      const statusCfg = STATUS_INFO[machine.status] || STATUS_INFO.offline;

      const icon = L.divIcon({
        html: createMarkerSvg(statusCfg.markerColor),
        className: 'leaflet-machine-marker',
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);

      marker.on('click', () => {
        if (mountedRef.current) setSelectedMachine(machine);
      });

      markersRef.current.push(marker);
    });
  }, [leafletReady, machines]);

  // Pan to selected machine – use animate: false
  useEffect(() => {
    if (selectedMachine && mapInstanceRef.current && mountedRef.current) {
      const coords = getCoordinatesForMachine(selectedMachine);
      try {
        mapInstanceRef.current.setView([coords.lat, coords.lng], mapInstanceRef.current.getZoom(), { animate: false });
      } catch {
        // Ignore if map container is detached
      }
    }
  }, [selectedMachine]);

  // ── Loading state ──
  if (loadError) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
        <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
          <MapPin size={28} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Failed to load map. Please check your connection.</p>
        </div>
      </div>
    );
  }

  if (!leafletReady) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
        <div className="h-full flex flex-col items-center justify-center gap-3">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  const activeMachine = selectedMachine;
  const activeStatus = activeMachine ? (STATUS_INFO[activeMachine.status] || STATUS_INFO.offline) : null;
  const activeStockLevel = activeMachine ? getMachineStockLevel(activeMachine) : 0;
  const activeTotalPcs = activeMachine ? getMachineTotalStockPcs(activeMachine) : 0;
  const activeTotalKg = activeMachine ? getMachineTotalStockKg(activeMachine) : 0;
  const activeProductCount = activeMachine ? (activeMachine.products || []).length : 0;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(STATUS_INFO).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
            <span>{cfg.label}</span>
          </div>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{machines.length} machine{machines.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Map + Info panel */}
      <div className="relative rounded-xl border border-border overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
        {/* Leaflet map container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Custom CSS for marker */}
        <style>{`
          .leaflet-machine-marker {
            background: transparent !important;
            border: none !important;
          }
          .leaflet-machine-marker svg {
            cursor: pointer;
            transition: transform 0.15s ease;
          }
          .leaflet-machine-marker:hover svg {
            transform: scale(1.2) translateY(-2px);
          }
        `}</style>

        {/* Info card overlay */}
        {activeMachine && activeStatus && (
          <div className="absolute bottom-3 left-3 right-3 z-[1000] animate-in slide-in-from-bottom-4 duration-200">
            <div className="bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden max-w-md mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <h4 className="text-sm font-bold truncate">{activeMachine.name}</h4>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                    style={{ backgroundColor: activeStatus.markerColor + '18', color: activeStatus.markerColor }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeStatus.markerColor }} />
                    {activeStatus.label}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMachine(null)}
                  className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer ml-2 shrink-0"
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>

              {/* Location + ID */}
              <div className="px-4 pb-2 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin size={10} className="shrink-0" />
                  <span className="truncate">{activeMachine.location}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  <Hash size={9} />{activeMachine.id}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-1 px-3 pb-2">
                <div className="bg-muted/40 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[9px] text-muted-foreground">Slots</div>
                  <div className="text-xs font-bold">{activeProductCount}/6</div>
                </div>
                <div className="bg-muted/40 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[9px] text-muted-foreground">Stock</div>
                  <div className={`text-xs font-bold ${activeStockLevel < 20 ? 'text-destructive' : activeStockLevel < 50 ? 'text-amber-600' : 'text-green-600'}`}>
                    {activeStockLevel}%
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[9px] text-muted-foreground">Pieces</div>
                  <div className="text-xs font-bold">{activeTotalPcs}</div>
                </div>
                <div className="bg-muted/40 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[9px] text-muted-foreground">Weight</div>
                  <div className="text-xs font-bold">{activeTotalKg}kg</div>
                </div>
              </div>

              {/* View details */}
              <div className="px-3 pb-3">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => onSelectMachine(activeMachine)}
                >
                  <ExternalLink size={12} className="mr-1.5" />
                  View Machine Details
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}