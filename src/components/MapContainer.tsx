/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { RiskZone } from '../services/db';
import type { RouteOption, SafeHaven } from '../services/safeRouteEngine';
import { Navigation } from 'lucide-react';

interface MapContainerProps {
  userLocation: { lat: number; lng: number; accuracy: number } | null;
  riskZones: RiskZone[];
  safeHavens: SafeHaven[];
  selectedRoute?: RouteOption | null;
  onMapClick?: (lat: number, lng: number) => void;
  onRecalibrateGps?: () => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  userLocation,
  riskZones,
  safeHavens,
  selectedRoute,
  onMapClick,
  onRecalibrateGps
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current) return;

    // Reset container ID if re-mounting
    if ((containerRef.current as any)._leaflet_id) {
      (containerRef.current as any)._leaflet_id = null;
    }

    const defaultLat = userLocation?.lat || 23.0732;
    const defaultLng = userLocation?.lng || 76.8561;

    const map = L.map(containerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: true
    });

    // 100% Free OpenStreetMap tile layer
    const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    });

    osmLayer.addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers & Layers when props change
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;

    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    layerGroup.clearLayers();

    // 1. Render High-Risk Danger Zones
    riskZones.forEach((zone) => {
      const color = zone.riskLevel === 'CRITICAL' ? '#f43f5e' : zone.riskLevel === 'HIGH' ? '#f97316' : '#eab308';

      const circle = L.circle([zone.lat, zone.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.25,
        radius: zone.radiusMeters,
        weight: 2,
        dashArray: '6, 6'
      });

      circle.bindPopup(`
        <div style="font-family: system-ui; padding: 4px; color: #f8fafc;">
          <strong style="color: ${color}; font-size: 13px;">⚠️ ${zone.name}</strong>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #cbd5e1;">${zone.description}</p>
          <span style="font-size: 10px; font-weight: bold; color: ${color}; uppercase">${zone.riskLevel} RISK ZONE</span>
        </div>
      `);

      layerGroup.addLayer(circle);
    });

    // 2. Render Safe Havens
    safeHavens.forEach((haven) => {
      const iconHtml = haven.type === 'POLICE'
        ? '🚓'
        : haven.type === 'HOSPITAL'
        ? '🏥'
        : '🏪';

      const customIcon = L.divIcon({
        className: 'custom-safe-haven-pin',
        html: `
          <div style="
            background: #0f172a;
            border: 2px solid #10b981;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          ">${iconHtml}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([haven.lat, haven.lng], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px; color: #f8fafc;">
          <strong style="color: #10b981; font-size: 13px;">🛡️ ${haven.name}</strong>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Emergency Safe Haven (24/7)</p>
          <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #38bdf8;">Call: ${haven.phone}</p>
        </div>
      `);
      layerGroup.addLayer(marker);
    });

    // 3. Render Routes
    if (selectedRoute && selectedRoute.waypoints.length > 1) {
      const routeCoords = selectedRoute.waypoints.map((w) => [w.lat, w.lng] as [number, number]);
      const isSafe = selectedRoute.id === 'SAFE_ROUTE';
      const polylineColor = isSafe ? '#10b981' : '#ef4444';

      const polyline = L.polyline(routeCoords, {
        color: polylineColor,
        weight: 5,
        opacity: 0.85,
        dashArray: isSafe ? undefined : '8, 8'
      });

      polyline.bindPopup(`
        <div style="font-family: system-ui; padding: 4px; color: #f8fafc;">
          <strong style="color: ${polylineColor}">${selectedRoute.title}</strong>
          <p style="margin: 2px 0 0 0; font-size: 11px;">Safety Rating: ${selectedRoute.safetyScore}%</p>
        </div>
      `);

      layerGroup.addLayer(polyline);

      const destWaypoint = selectedRoute.waypoints[selectedRoute.waypoints.length - 1];
      const destIcon = L.divIcon({
        className: 'dest-pin',
        html: `
          <div style="
            background: #e11d48;
            color: white;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 0 10px rgba(225, 29, 72, 0.8);
          ">📍</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const destMarker = L.marker([destWaypoint.lat, destWaypoint.lng], { icon: destIcon });
      layerGroup.addLayer(destMarker);
    }

    // 4. Render User Location Marker
    if (userLocation) {
      const userPos: [number, number] = [userLocation.lat, userLocation.lng];

      const accuracyCircle = L.circle(userPos, {
        radius: Math.max(15, userLocation.accuracy),
        color: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 0.15,
        weight: 1
      });
      layerGroup.addLayer(accuracyCircle);

      const userIcon = L.divIcon({
        className: 'user-location-pin',
        html: `
          <div style="
            position: relative;
            width: 26px;
            height: 26px;
            background: #0284c7;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 15px rgba(56, 189, 248, 0.9);
            cursor: pointer;
          ">
            <span style="
              position: absolute;
              top: -4px;
              left: -4px;
              width: 34px;
              height: 34px;
              border-radius: 50%;
              background: rgba(56, 189, 248, 0.4);
              animation: pulse-ring 1.8s infinite;
            "></span>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const userMarker = L.marker(userPos, { icon: userIcon, draggable: true });
      userMarker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px; color: #f8fafc;">
          <b style="color: #38bdf8;">Your Live Location</b><br/>
          <span style="font-size: 11px;">Lat: ${userLocation.lat.toFixed(5)}, Lng: ${userLocation.lng.toFixed(5)}</span><br/>
          <span style="font-size: 10px; color: #94a3b8;">(Click map or drag pin to adjust position)</span>
        </div>
      `);

      userMarker.on('dragend', (e: any) => {
        const newPos = e.target.getLatLng();
        if (onMapClick) {
          onMapClick(newPos.lat, newPos.lng);
        }
      });

      layerGroup.addLayer(userMarker);

      map.panTo(userPos, { animate: true, duration: 0.5 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [userLocation, riskZones, safeHavens, selectedRoute]);

  return (
    <div className="relative w-full h-[380px] sm:h-[480px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      <div ref={containerRef} className="w-full h-full z-0 min-h-[380px]" />

      {/* Map Overlay Badge */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between gap-3 shadow-lg max-w-[90%]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-semibold text-slate-200">
            {userLocation
              ? `GPS: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
              : 'Acquiring Device GPS...'}
          </span>
        </div>

        {onRecalibrateGps && (
          <button
            onClick={onRecalibrateGps}
            className="px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600/60 text-sky-300 rounded-lg text-[11px] font-bold border border-sky-500/40 transition-all flex items-center gap-1"
            title="Fetch Fresh High-Accuracy GPS Signal"
          >
            <Navigation className="w-3 h-3" /> Fetch Real GPS
          </button>
        )}
      </div>

      {/* Tip helper */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800/80 text-[10px] text-slate-400">
        💡 Click anywhere on map to pinpoint exact location
      </div>
    </div>
  );
};
