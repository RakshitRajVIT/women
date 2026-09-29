import React, { useEffect, useState } from 'react';
import { Shield, Wifi, WifiOff, Battery, Mic, UserCheck, Navigation, FileVideo, PhoneCall, Radio } from 'lucide-react';

interface HeaderProps {
  activeTab: 'DASHBOARD' | 'GUARDIAN' | 'SAFE_NAV' | 'EVIDENCE' | 'SETTINGS';
  setActiveTab: (tab: 'DASHBOARD' | 'GUARDIAN' | 'SAFE_NAV' | 'EVIDENCE' | 'SETTINGS') => void;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isSosActive: boolean;
  isVoiceActive: boolean;
  onFakeCallTrigger: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  threatLevel,
  isSosActive,
  isVoiceActive,
  onFakeCallTrigger
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number>(85);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Battery status API check
    if ('getBattery' in navigator) {
      (navigator as unknown as { getBattery: () => Promise<{ level: number; addEventListener: (t: string, cb: () => void) => void }> })
        .getBattery()
        .then((battery) => {
          setBatteryLevel(Math.round(battery.level * 100));
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getBadgeColor = () => {
    if (isSosActive) return 'bg-rose-600 text-white animate-pulse';
    switch (threatLevel) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Branding & Status */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 shadow-md shadow-rose-900/40">
                <Shield className="w-6 h-6 text-white" />
              </div>
              {isSosActive && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Aegis<span className="text-rose-500">Safety</span></h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getBadgeColor()}`}>
                  {isSosActive ? 'EMERGENCY SOS' : `${threatLevel} THREAT`}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Autonomous Offline AI Guard</span>
              </p>
            </div>
          </div>

          {/* Mobile Status badges */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onFakeCallTrigger}
              className="p-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 transition-all text-xs flex items-center gap-1"
              title="Trigger Fake Call"
            >
              <PhoneCall className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'DASHBOARD'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            AI Safety Hub
          </button>

          <button
            onClick={() => setActiveTab('GUARDIAN')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'GUARDIAN'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Guardian Dashboard
          </button>

          <button
            onClick={() => setActiveTab('SAFE_NAV')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'SAFE_NAV'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            AI Safe Route
          </button>

          <button
            onClick={() => setActiveTab('EVIDENCE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'EVIDENCE'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileVideo className="w-3.5 h-3.5" />
            Evidence Vault
          </button>
        </nav>

        {/* Right: Quick Tools & Status Indicators */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onFakeCallTrigger}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-all text-xs font-medium flex items-center gap-1.5"
            title="Simulate Fake incoming call to deter followers"
          >
            <PhoneCall className="w-3.5 h-3.5 text-indigo-400" />
            Fake Call
          </button>

          {/* Voice AI Status indicator */}
          <div
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border ${
              isVoiceActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={isVoiceActive ? 'Voice AI Listening for keywords ("Help", "Save me")' : 'Voice AI Paused'}
          >
            <Mic className={`w-3.5 h-3.5 ${isVoiceActive ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>{isVoiceActive ? 'Voice AI On' : 'Voice Off'}</span>
          </div>

          {/* Network & Battery Status */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 text-xs">
            <span
              className={`flex items-center gap-1 ${
                isOnline ? 'text-emerald-400' : 'text-amber-400 font-semibold'
              }`}
              title={isOnline ? 'Connected to Network' : 'Offline Mode (100% Functional)'}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Battery className="w-3.5 h-3.5 text-slate-400" />
              <span>{batteryLevel}%</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
