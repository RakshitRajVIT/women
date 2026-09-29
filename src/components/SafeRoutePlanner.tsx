import React, { useState } from 'react';
import type { RouteOption, SafeHaven } from '../services/safeRouteEngine';
import { safeRouteEngine } from '../services/safeRouteEngine';
import type { RiskZone } from '../services/db';
import { Navigation, ShieldCheck, AlertTriangle, MapPin, CheckCircle, Phone } from 'lucide-react';

interface SafeRoutePlannerProps {
  userLocation: { lat: number; lng: number } | null;
  riskZones: RiskZone[];
  onSelectRoute: (route: RouteOption | null) => void;
  selectedRoute?: RouteOption | null;
}

export const SafeRoutePlanner: React.FC<SafeRoutePlannerProps> = ({
  userLocation,
  riskZones,
  onSelectRoute,
  selectedRoute
}) => {
  const currentLat = userLocation?.lat || 23.0732;
  const currentLng = userLocation?.lng || 76.8561;

  const [destName, setDestName] = useState('Central Metro Transit Hub');
  const [destLat, setDestLat] = useState(currentLat + 0.015);
  const [destLng, setDestLng] = useState(currentLng + 0.018);

  const safeHavens: SafeHaven[] = safeRouteEngine.getNearbySafeHavens(currentLat, currentLng);

  const { safeRoute, standardRoute } = safeRouteEngine.calculateRoutes(
    { lat: currentLat, lng: currentLng },
    { lat: destLat, lng: destLng },
    riskZones
  );

  const handlePresetSelect = (preset: { name: string; dLat: number; dLng: number }) => {
    setDestName(preset.name);
    setDestLat(currentLat + preset.dLat);
    setDestLng(currentLng + preset.dLng);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Safe Route Recommendation Engine</h2>
            <p className="text-xs text-slate-400">Routes dynamically tuned to avoid high-risk crime spots & dark alleys</p>
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400">Quick Safe Destination Presets:</label>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'Central Metro Station', dLat: 0.012, dLng: 0.015 },
              { name: 'University Safe Campus Gate #2', dLat: -0.010, dLng: 0.018 },
              { name: 'Downtown Residence Apartment', dLat: 0.018, dLng: -0.012 },
            ].map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  destName === preset.name
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                📍 {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Route Cards Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Safe Route Card */}
        <div
          onClick={() => onSelectRoute(safeRoute)}
          className={`p-6 rounded-2xl border transition-all cursor-pointer space-y-4 ${
            selectedRoute?.id === 'SAFE_ROUTE'
              ? 'bg-emerald-950/30 border-emerald-500 shadow-2xl ring-2 ring-emerald-500/30'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="font-bold text-slate-100 text-base">{safeRoute.title}</h3>
                <span className="text-xs text-emerald-400 font-bold">Recommended for Night Travel</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-emerald-400">{safeRoute.safetyScore}%</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Safety Index</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-400">Distance</span>
              <p className="font-bold text-slate-200">{safeRoute.distanceKm} km</p>
            </div>
            <div>
              <span className="text-slate-400">Est. Time</span>
              <p className="font-bold text-slate-200">{safeRoute.etaMinutes} mins</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase">AI Safety Features:</h4>
            {safeRoute.highlights.map((h, i) => (
              <div key={i} className="text-xs text-emerald-300 flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{h}</span>
              </div>
            ))}
          </div>

          <button
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              selectedRoute?.id === 'SAFE_ROUTE'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white'
            }`}
          >
            {selectedRoute?.id === 'SAFE_ROUTE' ? 'Selected & Navigation Active' : 'Select Safe Route'}
          </button>
        </div>

        {/* Standard Route Card */}
        <div
          onClick={() => onSelectRoute(standardRoute)}
          className={`p-6 rounded-2xl border transition-all cursor-pointer space-y-4 ${
            selectedRoute?.id === 'STANDARD_ROUTE'
              ? 'bg-rose-950/30 border-rose-500 shadow-2xl ring-2 ring-rose-500/30'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
              <div>
                <h3 className="font-bold text-slate-100 text-base">{standardRoute.title}</h3>
                <span className="text-xs text-rose-400 font-bold">Unsafe Night Pass</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-rose-400">{standardRoute.safetyScore}%</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Safety Index</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-400">Distance</span>
              <p className="font-bold text-slate-200">{standardRoute.distanceKm} km</p>
            </div>
            <div>
              <span className="text-slate-400">Est. Time</span>
              <p className="font-bold text-slate-200">{standardRoute.etaMinutes} mins</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase">Risk Factors:</h4>
            {standardRoute.highlights.map((h, i) => (
              <div key={i} className="text-xs text-rose-300 flex items-start gap-1.5">
                <span className="text-rose-400 font-bold mt-0.5">•</span>
                <span>{h}</span>
              </div>
            ))}
          </div>

          <button
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              selectedRoute?.id === 'STANDARD_ROUTE'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-rose-600 hover:text-white'
            }`}
          >
            {selectedRoute?.id === 'STANDARD_ROUTE' ? 'Selected' : 'Select Standard Route'}
          </button>
        </div>
      </div>

      {/* Nearby Safe Havens Section */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-400" /> Nearby Emergency Safe Havens (24/7 Verified)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {safeHavens.map((haven) => (
            <div key={haven.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">
                  {haven.type === 'POLICE' ? '🚓 Police Station' : haven.type === 'HOSPITAL' ? '🏥 Hospital' : '🏪 Safe Store'}
                </span>
                <span className="text-[10px] text-slate-400">{haven.distanceMeters}m away</span>
              </div>
              <h4 className="font-bold text-slate-200 text-xs">{haven.name}</h4>
              <a
                href={`tel:${haven.phone}`}
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-mono font-semibold"
              >
                <Phone className="w-3 h-3" /> {haven.phone}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
