import React, { useState, useEffect } from 'react';
import { ShieldAlert, Volume2, VolumeX, X, AlertTriangle } from 'lucide-react';
import { audioAlertService } from '../services/audioAlertService';
import { smsDispatchService } from '../services/smsDispatchService';

interface SosButtonProps {
  isSosActive: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onTriggerSos: (reason: string, isSilent: boolean) => void;
  onCancelSos: () => void;
}

export const SosButton: React.FC<SosButtonProps> = ({
  isSosActive,
  userLocation,
  onTriggerSos,
  onCancelSos,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSilent, setIsSilent] = useState<boolean>(false);
  const [pendingReason, setPendingReason] = useState<string>('MANUAL_PRESS');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown !== null && countdown > 0) {
      audioAlertService.playCountdownBeep(600 + (5 - countdown) * 100);
      timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      onTriggerSos(pendingReason, isSilent);
    }
    return () => clearTimeout(timer);
  }, [countdown, onTriggerSos, pendingReason, isSilent]);

  const handleStartSos = (reason = 'Manual SOS Activated', silent = false) => {
    setPendingReason(reason);
    setIsSilent(silent);
    setCountdown(5); // 5 second cancel window
  };

  const handleCancelCountdown = () => {
    setCountdown(null);
    audioAlertService.stopSiren();
  };

  const handleManualDispatch = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          smsDispatchService.dispatchSosToGuardians({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            threatScore: 90,
            threatLevel: 'CRITICAL',
            reason: 'EMERGENCY_SOS_BUTTON'
          });
        },
        (err) => {
          console.warn('GPS error, using active location:', err);
          if (userLocation) {
            smsDispatchService.dispatchSosToGuardians({
              lat: userLocation.lat,
              lng: userLocation.lng,
              threatScore: 90,
              threatLevel: 'CRITICAL',
              reason: 'EMERGENCY_SOS_BUTTON'
            });
          } else {
            alert('Please allow Location access in your browser address bar so your real location can be sent!');
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else if (userLocation) {
      smsDispatchService.dispatchSosToGuardians({
        lat: userLocation.lat,
        lng: userLocation.lng,
        threatScore: 90,
        threatLevel: 'CRITICAL',
        reason: 'EMERGENCY_SOS_BUTTON'
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Active Emergency State Overlay */}
      {isSosActive ? (
        <div className="w-full bg-gradient-to-r from-rose-950/90 via-red-900/90 to-rose-950/90 border-2 border-rose-500 rounded-2xl p-6 shadow-2xl shadow-rose-950/80 animate-pulse text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-rose-600/30 text-rose-400 border border-rose-500/50">
            <ShieldAlert className="w-10 h-10 animate-bounce" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-rose-100 tracking-wider">EMERGENCY SOS ACTIVE</h2>
            <p className="text-xs text-rose-300 mt-1">
              Audio/Video Evidence Recording & Live Guardian Broadcast in progress
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleManualDispatch}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition-all text-xs flex items-center gap-2"
            >
              📱 DISPATCH EMERGENCY SMS / SHARE LOCATION
            </button>

            <button
              onClick={onCancelSos}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-rose-500/40 shadow-lg transition-all text-xs flex items-center gap-2"
            >
              <X className="w-4 h-4 text-rose-400" />
              CANCEL ALARM
            </button>
          </div>
        </div>
      ) : countdown !== null ? (
        /* Countdown Cancellation Window */
        <div className="w-full bg-slate-900/95 border-2 border-amber-500 rounded-2xl p-6 shadow-2xl text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-amber-400">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
            <span className="font-bold text-lg">Activating SOS Emergency in...</span>
          </div>

          <div className="text-6xl font-black text-amber-400 font-mono tracking-tighter">
            {countdown}s
          </div>

          <p className="text-xs text-slate-400">
            Tap Cancel below if this was triggered accidentally.
          </p>

          <button
            onClick={handleCancelCountdown}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl border border-amber-500/40 transition-all text-sm flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            CANCEL SOS (False Alarm)
          </button>
        </div>
      ) : (
        /* Default SOS Controls */
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="relative group">
            <button
              onClick={() => handleStartSos('MANUAL_PRESS', false)}
              className="relative z-10 w-44 h-44 rounded-full bg-gradient-to-tr from-rose-700 via-rose-600 to-pink-500 text-white flex flex-col items-center justify-center shadow-2xl shadow-rose-900/70 border-4 border-rose-400/40 hover:scale-105 active:scale-95 transition-all animate-sos-pulse group"
            >
              <ShieldAlert className="w-14 h-14 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
              <span className="text-xl font-black tracking-widest mt-1">S.O.S</span>
              <span className="text-[10px] font-semibold tracking-wider text-rose-100 uppercase opacity-90">
                TAP FOR HELP
              </span>
            </button>
          </div>

          {/* Silent SOS Toggle */}
          <div className="flex items-center justify-between w-full max-w-sm bg-slate-900/70 px-4 py-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              {isSilent ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
              <span>{isSilent ? 'Silent Mode (Discreet Evidence Only)' : 'Loud Siren & Evidence Record'}</span>
            </div>

            <button
              onClick={() => setIsSilent(!isSilent)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                isSilent
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isSilent ? 'Silent' : 'Loud'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
