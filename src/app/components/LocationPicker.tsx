import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Loader2, Crosshair, Navigation, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

// ─── CDN Leaflet loader ─────────────────────────────────────────────────

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

let leafletLoadPromise: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    if (!document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const script = document.createElement('script');
      script.src = LEAFLET_JS;
      script.onload = () => resolve((window as any).L);
      script.onerror = () => reject(new Error('Failed to load Leaflet'));
      document.head.appendChild(script);
    } else {
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

// ─── Nominatim geocoding (free, no API key) ─────────────────────────────

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

async function searchPlaces(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&limit=5`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    });
    return await res.json();
  } catch {
    return [];
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    });
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// ─── SVG pin marker ─────────────────────────────────────────────────────

function createPinSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
    <filter id="ds" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/></filter>
    <path filter="url(#ds)" d="M16 2C8.8 2 3 7.8 3 15c0 11 13 26 13 26s13-15 13-26C29 7.8 23.2 2 16 2z" fill="#1F4D3A" stroke="white" stroke-width="2"/>
    <circle cx="16" cy="15" r="6" fill="white"/>
    <circle cx="16" cy="15" r="3.5" fill="#D4AF37"/>
  </svg>`;
}

// ─── Component ──────────────────────────────────────────────────────────

interface LocationPickerProps {
  location: string;
  lat: number | null;
  lng: number | null;
  onLocationChange: (location: string, lat: number | null, lng: number | null) => void;
}

export function LocationPicker({ location, lat, lng, onLocationChange }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const [leafletReady, setLeafletReady] = useState(!!(window as any).L);
  const [loadError, setLoadError] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Keep a stable ref to onLocationChange so the map click handler always has the latest
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;

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

    const defaultLat = lat ?? 14.45;
    const defaultLng = lng ?? 120.90;
    const defaultZoom = lat && lng ? 16 : 10;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Add zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    // Place existing marker if lat/lng exist
    if (lat && lng) {
      const icon = L.divIcon({
        html: createPinSvg(),
        className: 'leaflet-location-pin',
        iconSize: [32, 44],
        iconAnchor: [16, 44],
      });
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    }

    // Click to place pin
    map.on('click', (e: any) => {
      if (!mountedRef.current) return;
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;
      placeMarkerOnMap(clickLat, clickLng);

      // Reverse geocode
      setReverseLoading(true);
      reverseGeocode(clickLat, clickLng).then(name => {
        if (!mountedRef.current) return;
        const parts = name.split(', ');
        const shortName = parts.slice(0, Math.min(3, parts.length)).join(', ');
        onLocationChangeRef.current(shortName, clickLat, clickLng);
        setReverseLoading(false);
      });
    });

    return () => {
      mapInstanceRef.current = null;
      markerRef.current = null;
      try {
        map.off();
        map.remove();
      } catch {
        // Swallow errors during cleanup – container may already be gone
      }
    };
  }, [leafletReady]);

  const placeMarkerOnMap = useCallback((markerLat: number, markerLng: number) => {
    if (!mapInstanceRef.current || !mountedRef.current) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;

    // Remove old marker
    if (markerRef.current) {
      try { map.removeLayer(markerRef.current); } catch { /* ignore */ }
    }

    const icon = L.divIcon({
      html: createPinSvg(),
      className: 'leaflet-location-pin',
      iconSize: [32, 44],
      iconAnchor: [16, 44],
    });
    markerRef.current = L.marker([markerLat, markerLng], { icon }).addTo(map);
    // Use animate: false to avoid classList error when container is removed mid-animation
    map.setView([markerLat, markerLng], Math.max(map.getZoom(), 15), { animate: false });
  }, []);

  // Debounced search
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchPlaces(value);
      setSearchResults(results);
      setShowResults(results.length > 0);
      setSearching(false);
    }, 400);
  };

  const handleSelectResult = (result: NominatimResult) => {
    const resultLat = parseFloat(result.lat);
    const resultLng = parseFloat(result.lon);
    // Shorten name
    const parts = result.display_name.split(', ');
    const shortName = parts.slice(0, Math.min(3, parts.length)).join(', ');

    onLocationChange(shortName, resultLat, resultLng);
    placeMarkerOnMap(resultLat, resultLng);
    setShowResults(false);
    setSearchQuery('');
  };

  // Close results dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Get user's current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setReverseLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!mountedRef.current) return;
        const geoLat = pos.coords.latitude;
        const geoLng = pos.coords.longitude;
        placeMarkerOnMap(geoLat, geoLng);
        const name = await reverseGeocode(geoLat, geoLng);
        if (!mountedRef.current) return;
        const parts = name.split(', ');
        const shortName = parts.slice(0, Math.min(3, parts.length)).join(', ');
        onLocationChange(shortName, geoLat, geoLng);
        setReverseLoading(false);
      },
      () => {
        if (mountedRef.current) setReverseLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Machine Location <span className="text-primary">*</span>
        </label>
      </div>

      {/* Search bar */}
      <div className="relative" ref={resultsRef}>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder="Search address or area..."
              className="pl-11 pr-10 h-12 text-sm bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all font-bold"
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
            />
            {searching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary/40" />
            )}
            {searchQuery && !searching && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={14} className="text-slate-400" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-12 bg-slate-50 border-none rounded-2xl shrink-0 text-slate-600 hover:bg-slate-100 hover:text-primary transition-all"
            onClick={handleGetCurrentLocation}
            title="Use my current location"
          >
            <Navigation size={18} />
          </Button>
        </div>

        {/* Search results dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-[2000] overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectResult(result)}
                className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-0"
              >
                <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                <span className="text-xs font-bold text-slate-700 leading-snug line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current location display */}
      {location && (
        <div className="flex items-center gap-4 px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-[1.5rem] shadow-sm">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
             <MapPin size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-900 truncate tracking-tight">{location}</p>
            {lat && lng && (
              <p className="text-[9px] text-primary/60 font-black uppercase tracking-widest mt-0.5">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
            )}
          </div>
          {reverseLoading && <Loader2 size={14} className="animate-spin text-primary shrink-0" />}
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm" style={{ height: 260 }}>
        {loadError ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 bg-slate-50">
            <MapPin size={24} className="text-slate-300" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Failed to load map</p>
          </div>
        ) : !leafletReady ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing Map...</p>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full" />
        )}

        {/* Tap hint overlay */}
        {leafletReady && !lat && !lng && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/80 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full backdrop-blur-md pointer-events-none flex items-center gap-2">
            <Crosshair size={12} className="text-primary" />
            Tap to pin unit
          </div>
        )}

        {/* Custom marker CSS */}
        <style>{`
          .leaflet-location-pin {
            background: transparent !important;
            border: none !important;
          }
          .leaflet-location-pin svg {
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .leaflet-location-pin:hover svg {
            transform: scale(1.1);
          }
        `}</style>
      </div>

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
        Search address, use GPS, or tap map to pin the exact machine location for technicians.
      </p>
    </div>
  );
}
