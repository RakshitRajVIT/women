import { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { SosButton } from './components/SosButton';
import { AiThreatGauge } from './components/AiThreatGauge';
import { MapContainer } from './components/MapContainer';
import { GuardianDashboard } from './components/GuardianDashboard';
import { EvidenceVault } from './components/EvidenceVault';
import { SafeRoutePlanner } from './components/SafeRoutePlanner';
import { FakeCallModal } from './components/FakeCallModal';
import { AiDetectionControls } from './components/AiDetectionControls';

import type { RiskZone } from './services/db';
import { db, seedInitialData, DEFAULT_RISK_ZONES } from './services/db';
import type { ThreatAnalysisResult } from './services/aiThreatEngine';
import { aiThreatEngine } from './services/aiThreatEngine';
import type { RouteOption, SafeHaven } from './services/safeRouteEngine';
import { safeRouteEngine } from './services/safeRouteEngine';
import type { GuardianSyncState } from './services/guardianSyncService';
import { guardianSyncService } from './services/guardianSyncService';
import { mediaRecorderService } from './services/mediaRecorderService';
import { audioAlertService } from './services/audioAlertService';
import { aiDangerDetector } from './services/aiDangerDetector';
import { smsDispatchService } from './services/smsDispatchService';

export function App() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GUARDIAN' | 'SAFE_NAV' | 'EVIDENCE' | 'SETTINGS'>('DASHBOARD');

  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>({
    lat: 23.0732,
    lng: 76.8561,
    accuracy: 15
  });

  // Database risk zones & safe havens
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [safeHavens, setSafeHavens] = useState<SafeHaven[]>([]);

  const [isSosActive, setIsSosActive] = useState<boolean>(false);
  const [sosReason, setSosReason] = useState<string>('');
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);

  useEffect(() => {
    const checkVoice = setInterval(() => {
      setIsVoiceActive(aiDangerDetector.getIsVoiceActive());
    }, 1000);
    return () => clearInterval(checkVoice);
  }, []);

  // Fake Call modal
  const [isFakeCallOpen, setIsFakeCallOpen] = useState<boolean>(false);

  // Selected Safe Navigation Route
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);

  // AI Threat Computation State
  const [threatResult, setThreatResult] = useState<ThreatAnalysisResult>(() =>
    aiThreatEngine.analyzeThreat({
      lat: 23.0732,
      lng: 76.8561,
      riskZones: [],
      isAudioDistress: false,
      isMotionShake: false,
      isOffline: !navigator.onLine,
      batteryLevel: 85
    })
  );

  // Initialize DB and Continuous GPS Tracking
  useEffect(() => {
    const initData = async () => {
      try {
        await seedInitialData();
        const zones = await db.riskZones.toArray().catch(() => DEFAULT_RISK_ZONES);
        setRiskZones(zones.length > 0 ? zones : DEFAULT_RISK_ZONES);
      } catch (e) {
        console.warn('Fallback risk zones loaded:', e);
        setRiskZones(DEFAULT_RISK_ZONES);
      }
      const havens = safeRouteEngine.getNearbySafeHavens(23.0732, 76.8561);
      setSafeHavens(havens);
    };

    initData();

    // Trigger browser's native Location Permission prompt immediately on page load
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const realCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 10)
          };
          console.log('[Native GPS Prompt] Location permission granted instantly:', realCoords);
          setUserLocation(realCoords);
          const havens = safeRouteEngine.getNearbySafeHavens(realCoords.lat, realCoords.lng);
          setSafeHavens(havens);
        },
        (err) => {
          console.warn('[Native GPS Prompt Error]:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 10)
          });
        },
        (err) => {
          console.warn('Geolocation watchPosition error:', err);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Fetch fresh real GPS location callback
  const fetchRealGps = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const realCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 10)
          };
          console.log('[GPS Recalibrate] Real location acquired:', realCoords);
          setUserLocation(realCoords);
          const havens = safeRouteEngine.getNearbySafeHavens(realCoords.lat, realCoords.lng);
          setSafeHavens(havens);
        },
        (err) => console.warn('[GPS Recalibrate Error]:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  // Recalculate AI Threat Engine on location/zones update
  useEffect(() => {
    if (!userLocation) return;
    const res = aiThreatEngine.analyzeThreat({
      lat: userLocation.lat,
      lng: userLocation.lng,
      riskZones,
      isAudioDistress: false,
      isMotionShake: false,
      isOffline: !navigator.onLine,
      batteryLevel: 85
    });
    setThreatResult(res);

    const havens = safeRouteEngine.getNearbySafeHavens(userLocation.lat, userLocation.lng);
    setSafeHavens(havens);
  }, [userLocation, riskZones]);

  // Sync state to Guardian Broadcast channel
  useEffect(() => {
    const syncState: GuardianSyncState = {
      userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng, accuracy: userLocation.accuracy, speed: null } : null,
      threatScore: threatResult.score,
      threatLevel: threatResult.level,
      isSosActive,
      sosReason,
      batteryLevel: 85,
      isOnline: navigator.onLine,
      lastUpdated: new Date().toISOString()
    };
    guardianSyncService.publishState(syncState);
  }, [userLocation, threatResult, isSosActive, sosReason]);

  // Listen to remote Guardian commands (e.g. Remote siren trigger)
  useEffect(() => {
    const unsub = guardianSyncService.onGuardianCommand((payload) => {
      if (payload.command === 'TRIGGER_SIREN') {
        handleTriggerSos('Remote Guardian Triggered Alarm', false);
      } else if (payload.command === 'STOP_SIREN') {
        handleCancelSos();
      }
    });
    return () => unsub();
  }, []);

  // Listen to AI Danger Detector triggers (Voice, Motion, Scream)
  useEffect(() => {
    const unsubDanger = aiDangerDetector.onTrigger((type, detail) => {
      console.warn(`[AI Danger Detector Trigger] ${type}: ${detail}`);
      handleTriggerSos(`${type}: ${detail}`, false);
    });
    return () => unsubDanger();
  }, []);

  // Core Emergency SOS Handler
  const handleTriggerSos = useCallback(async (reason = 'Manual SOS', isSilent = false) => {
    setIsSosActive(true);
    setSosReason(reason);

    // 1. Play Emergency Siren (unless silent mode)
    if (!isSilent) {
      audioAlertService.startSiren();
    }

    // 2. Automatically launch audio & video evidence recording
    await mediaRecorderService.startEmergencyRecording();

    // 3. Fetch fresh high-accuracy real GPS coordinates of this device
    let currentLat = userLocation?.lat || 23.0732;
    let currentLng = userLocation?.lng || 76.8561;

    if ('geolocation' in navigator) {
      try {
        const freshPos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        currentLat = freshPos.coords.latitude;
        currentLng = freshPos.coords.longitude;
        setUserLocation({ lat: currentLat, lng: currentLng, accuracy: freshPos.coords.accuracy || 10 });
      } catch (geoErr) {
        console.warn('Using watchPosition GPS coordinates:', geoErr);
      }
    }

    // 4. Dispatch real background Twilio SMS with live Google Maps location to & guardians
    const dispatchRes = await smsDispatchService.dispatchSosToGuardians({
      lat: currentLat,
      lng: currentLng,
      threatScore: threatResult.score,
      threatLevel: threatResult.level,
      reason: reason
    });

    // 5. Log emergency to DB with Google Maps link & SMS dispatch count
    await db.emergencyLogs.add({
      timestamp: new Date().toISOString(),
      type: reason.includes('VOICE') ? 'VOICE_TRIGGER' : reason.includes('MOTION') ? 'MOTION_SHAKE' : 'MANUAL_SOS',
      threatScore: threatResult.score,
      lat: currentLat,
      lng: currentLng,
      mapsUrl: smsDispatchService.getGoogleMapsUrl(currentLat, currentLng),
      dispatchedSmsCount: dispatchRes.sentSmsCount,
      status: 'ACTIVE',
      notes: reason
    });
  }, [threatResult.score, threatResult.level, userLocation]);

  // Cancel Emergency SOS Handler
  const handleCancelSos = useCallback(async () => {
    setIsSosActive(false);
    audioAlertService.stopSiren();

    // Stop evidence recording & persist blob to IndexedDB
    if (userLocation) {
      await mediaRecorderService.stopEmergencyRecording(sosReason || 'SOS Completed', threatResult.score, {
        lat: userLocation.lat,
        lng: userLocation.lng
      });
    }
  }, [sosReason, threatResult.score, userLocation]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        threatLevel={threatResult.level}
        isSosActive={isSosActive}
        isVoiceActive={isVoiceActive}
        onFakeCallTrigger={() => setIsFakeCallOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6">
            {/* Top Grid: SOS Button & AI Threat Gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex items-center justify-center">
                <SosButton
                  isSosActive={isSosActive}
                  userLocation={userLocation}
                  onTriggerSos={handleTriggerSos}
                  onCancelSos={handleCancelSos}
                />
              </div>

              <div className="lg:col-span-8">
                <AiThreatGauge threatResult={threatResult} />
              </div>
            </div>

            {/* AI Detector Controls & Sensor Simulator */}
            <AiDetectionControls
              onSimulateTrigger={(type, detail) => handleTriggerSos(`SIMULATED_${type}: ${detail}`, false)}
            />

            {/* Interactive Map & Danger Radar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Interactive Safety Radar & Risk Zones</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {riskZones.length} High-Risk Areas Mapped
                </span>
              </div>

              <MapContainer
                userLocation={userLocation}
                riskZones={riskZones}
                safeHavens={safeHavens}
                selectedRoute={selectedRoute}
                onMapClick={(lat, lng) => {
                  const newLoc = { lat, lng, accuracy: 5 };
                  setUserLocation(newLoc);
                  const havens = safeRouteEngine.getNearbySafeHavens(lat, lng);
                  setSafeHavens(havens);
                }}
                onRecalibrateGps={fetchRealGps}
              />
            </div>
          </div>
        )}

        {activeTab === 'GUARDIAN' && (
          <div className="space-y-6">
            <GuardianDashboard
              currentSyncState={{
                userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng, accuracy: userLocation.accuracy, speed: null } : null,
                threatScore: threatResult.score,
                threatLevel: threatResult.level,
                isSosActive,
                sosReason,
                batteryLevel: 85,
                isOnline: navigator.onLine,
                lastUpdated: new Date().toISOString()
              }}
            />
          </div>
        )}

        {activeTab === 'SAFE_NAV' && (
          <div className="space-y-6">
            <SafeRoutePlanner
              userLocation={userLocation}
              riskZones={riskZones}
              onSelectRoute={(route) => setSelectedRoute(route)}
              selectedRoute={selectedRoute}
            />

            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-100">Safe Route Map Visualizer</h3>
              <MapContainer
                userLocation={userLocation}
                riskZones={riskZones}
                safeHavens={safeHavens}
                selectedRoute={selectedRoute}
                onMapClick={(lat, lng) => {
                  const newLoc = { lat, lng, accuracy: 5 };
                  setUserLocation(newLoc);
                  const havens = safeRouteEngine.getNearbySafeHavens(lat, lng);
                  setSafeHavens(havens);
                }}
                onRecalibrateGps={fetchRealGps}
              />
            </div>
          </div>
        )}

        {activeTab === 'EVIDENCE' && (
          <div className="space-y-6">
            <EvidenceVault isSosActive={isSosActive} />
          </div>
        )}
      </main>

      {/* Fake Call Simulated Modal */}
      <FakeCallModal
        isOpen={isFakeCallOpen}
        onClose={() => setIsFakeCallOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>AegisSafety Autonomous Offline AI Women Safety Platform • 100% No Network Dependency • IDB Encrypted</p>
      </footer>
    </div>
  );
}

export default App;
