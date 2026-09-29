import type { RiskZone } from './db';

export interface ThreatAnalysisResult {
  score: number; // 0 to 100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: {
    timeRisk: number;
    locationRisk: number;
    motionRisk: number;
    audioRisk: number;
    deviceIsolationRisk: number;
  };
  explanation: string[];
  recommendations: string[];
}

export class AIThreatEngine {
  // Haversine distance formula in meters
  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  public analyzeThreat(params: {
    lat: number;
    lng: number;
    time?: Date;
    riskZones: RiskZone[];
    isAudioDistress: boolean;
    audioVolumeDb?: number;
    isMotionShake: boolean;
    isOffline: boolean;
    batteryLevel: number;
  }): ThreatAnalysisResult {
    const now = params.time || new Date();
    const hour = now.getHours();
    const explanation: string[] = [];
    const recommendations: string[] = [];

    // 1. Time Risk Assessment
    let timeRisk = 5;
    if (hour >= 22 || hour < 5) {
      timeRisk = 35;
      explanation.push('High-risk hours detected (Late night: 10 PM - 5 AM).');
    } else if (hour >= 19 && hour < 22) {
      timeRisk = 20;
      explanation.push('Moderate time risk (Evening hours).');
    } else {
      timeRisk = 5;
      explanation.push('Low time risk (Standard daytime).');
    }

    // 2. Location & Proximity Risk
    let locationRisk = 0;
    let closestZoneName = '';
    let closestDist = Infinity;

    for (const zone of params.riskZones) {
      const dist = this.calculateDistanceMeters(params.lat, params.lng, zone.lat, zone.lng);
      if (dist < closestDist) {
        closestDist = dist;
        closestZoneName = zone.name;
      }
    }

    if (closestDist <= 200) {
      locationRisk = 35;
      explanation.push(`Inside perimeter of high-risk zone: "${closestZoneName}" (${Math.round(closestDist)}m away).`);
    } else if (closestDist <= 500) {
      locationRisk = 20;
      explanation.push(`Approaching high-risk area: "${closestZoneName}" (${Math.round(closestDist)}m away).`);
    } else if (closestDist <= 1000) {
      locationRisk = 10;
      explanation.push(`Proximity to caution zone (${Math.round(closestDist)}m).`);
    } else {
      locationRisk = 5;
      explanation.push('Location assessed as relatively safe perimeter.');
    }

    // 3. Audio / Noise Risk
    let audioRisk = 0;
    if (params.isAudioDistress) {
      audioRisk = 35;
      explanation.push('AI Voice Detector matched distress keyword ("Help" / "Stop" / Scream).');
    } else if (params.audioVolumeDb && params.audioVolumeDb > 75) {
      audioRisk = 20;
      explanation.push(`Elevated ambient audio intensity (${Math.round(params.audioVolumeDb)} dB).`);
    }

    // 4. Motion Risk
    let motionRisk = 0;
    if (params.isMotionShake) {
      motionRisk = 30;
      explanation.push('Accelerated panic motion / shake pattern detected on device.');
    }

    // 5. Device Isolation & Battery Risk
    let deviceIsolationRisk = 0;
    if (params.isOffline) {
      deviceIsolationRisk += 10;
      explanation.push('Device is offline (network isolation factor applied).');
    }
    if (params.batteryLevel < 15) {
      deviceIsolationRisk += 10;
      explanation.push(`Low battery warning (${params.batteryLevel}% remaining).`);
    }

    // Total Composite Threat Score calculation (capped at 100)
    let totalScore = Math.min(100, Math.max(0, timeRisk + locationRisk + audioRisk + motionRisk + deviceIsolationRisk));

    // Determine Level
    let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (totalScore >= 75 || params.isAudioDistress || params.isMotionShake) {
      level = 'CRITICAL';
    } else if (totalScore >= 50) {
      level = 'HIGH';
    } else if (totalScore >= 30) {
      level = 'MEDIUM';
    } else {
      level = 'LOW';
    }

    // Generate Contextual AI Recommendations
    if (level === 'CRITICAL') {
      recommendations.push('Trigger immediate SOS to primary guardians.');
      recommendations.push('Automatic evidence recording activated.');
      recommendations.push('Reroute towards nearest safe haven (Police Station).');
    } else if (level === 'HIGH') {
      recommendations.push('Move to a well-lit street with public visibility.');
      recommendations.push('Keep Guardian live tracking active.');
      recommendations.push('Prepare quick-action fake call if feeling followed.');
    } else if (level === 'MEDIUM') {
      recommendations.push('Avoid unlit shortcuts or isolated pathways.');
      recommendations.push('Ensure primary guardian is notified of your ETA.');
    } else {
      recommendations.push('Path is clear. Maintain ambient awareness.');
    }

    return {
      score: totalScore,
      level,
      factors: {
        timeRisk,
        locationRisk,
        motionRisk,
        audioRisk,
        deviceIsolationRisk
      },
      explanation,
      recommendations
    };
  }
}

export const aiThreatEngine = new AIThreatEngine();
