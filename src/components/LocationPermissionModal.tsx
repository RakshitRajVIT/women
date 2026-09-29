import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface LocationPermissionModalProps {
  onLocationAcquired: (coords: { lat: number; lng: number; accuracy: number }) => void;
  currentLocation: { lat: number; lng: number; accuracy: number } | null;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  onLocationAcquired,
  currentLocation
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if permission was already granted
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        if (status.state === 'granted') {
          requestRealGpsLocation(false);
        }
      }).catch(() => {});
    }
  }, []);

  const requestRealGpsLocation = (showUI = true) => {
    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation GPS is not supported by your web browser.');
      return;
    }

    if (showUI) {
      setIsLoading(true);
      setErrorMsg(null);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 10)
        };
        console.log('[GPS Engine] Acquired real live GPS coordinates:', coords);
        onLocationAcquired(coords);
        setIsLoading(false);
        setIsSuccess(true);
        // Auto dismiss modal after 1.5s on success
        setTimeout(() => {
          setIsOpen(false);
        }, 1500);
      },
      (err) => {
        console.warn('[GPS Engine Error]:', err);
        setIsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('Location permission was denied. Please allow Location access in your browser address bar.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setErrorMsg('GPS location signal unavailable. Please ensure Location/GPS is turned ON in your device settings.');
        } else {
          setErrorMsg('GPS request timed out. Click retry to request real location again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/50 rounded-2xl p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none"></div>

        {/* Icon */}
        <div className="inline-flex p-4 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
          {isSuccess ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
          ) : (
            <MapPin className="w-10 h-10 text-rose-500 animate-pulse" />
          )}
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-white">
            {isSuccess ? 'Live GPS Location Acquired!' : 'Allow Live GPS Location Access'}
          </h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            AegisSafety requires high-accuracy device GPS to send your real live Google Maps location to your family (+919552970713) during emergency SOS alerts.
          </p>
        </div>

        {/* Real Coordinates Readout */}
        {currentLocation && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-sky-400 space-y-1">
            <div className="text-[10px] text-slate-400 font-sans uppercase font-bold">Acquired Device GPS Coordinates</div>
            <div>
              Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
            </div>
            <div className="text-[10px] text-emerald-400 font-sans">
              Accuracy: {currentLocation.accuracy}m
            </div>
          </div>
        )}

        {/* Error message if denied */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2 text-left">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-2 pt-2">
          {!isSuccess ? (
            <button
              onClick={() => requestRealGpsLocation(true)}
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-rose-950/60 transition-all text-xs flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Acquiring Device GPS Signal...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>ALLOW LIVE GPS LOCATION NOW</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Proceed to AegisSafety Dashboard</span>
            </button>
          )}

          <p className="text-[10px] text-slate-500">
            Clicking allow prompts your browser's native location permission dialog.
          </p>
        </div>
      </div>
    </div>
  );
};
