import Dexie, { type Table } from 'dexie';

export interface EvidenceRecord {
  id?: number;
  timestamp: string;
  triggerReason: string;
  threatScore: number;
  lat: number;
  lng: number;
  address?: string;
  audioBlob?: Blob;
  videoBlob?: Blob;
  durationSeconds: number;
  fileName: string;
}

export interface GuardianContact {
  id?: number;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

export interface RiskZone {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  riskLevel: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface EmergencyLog {
  id?: number;
  timestamp: string;
  type: 'VOICE_TRIGGER' | 'MOTION_SHAKE' | 'MANUAL_SOS' | 'AI_HIGH_THREAT' | 'DANGER_ZONE_ENTERED';
  threatScore: number;
  lat: number;
  lng: number;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  notes?: string;
  mapsUrl?: string;
  dispatchedSmsCount?: number;
}

export interface AppSettings {
  id?: number;
  userName: string;
  userPhone: string;
  customSosMessage: string;
  autoSendSms: boolean;
  autoSendWhatsapp: boolean;
}

class AegisDatabase extends Dexie {
  evidenceLogs!: Table<EvidenceRecord>;
  guardianContacts!: Table<GuardianContact>;
  riskZones!: Table<RiskZone>;
  emergencyLogs!: Table<EmergencyLog>;
  appSettings!: Table<AppSettings>;

  constructor() {
    super('AegisSafetyDB');
    
    // Support version 1 & 2 for backwards compatibility without breaking existing DB
    this.version(1).stores({
      evidenceLogs: '++id, timestamp, triggerReason, threatScore',
      guardianContacts: '++id, name, isPrimary',
      riskZones: '++id, name, riskLevel',
      emergencyLogs: '++id, timestamp, type, status'
    });

    this.version(2).stores({
      evidenceLogs: '++id, timestamp, triggerReason, threatScore',
      guardianContacts: '++id, name, isPrimary',
      riskZones: '++id, name, riskLevel',
      emergencyLogs: '++id, timestamp, type, status',
      appSettings: '++id'
    });
  }
}

export const db = new AegisDatabase();

// Default fallback risk zones
export const DEFAULT_RISK_ZONES: RiskZone[] = [
  { id: 1, name: 'Unlit Alley Precinct', lat: 23.0732, lng: 76.8561, radiusMeters: 300, riskLevel: 'HIGH', description: 'Reported poor lighting & lack of surveillance.' },
  { id: 2, name: 'Isolated Industrial Belt', lat: 28.6250, lng: 77.2180, radiusMeters: 500, riskLevel: 'CRITICAL', description: 'High incidence zone at nighttime.' },
  { id: 3, name: 'Construction Pass', lat: 28.6080, lng: 77.2000, radiusMeters: 250, riskLevel: 'MEDIUM', description: 'Under construction area with blocked sightlines.' }
];

// Seed initial data safely
export async function seedInitialData() {
  try {
    const contactsCount = await db.guardianContacts.count().catch(() => 0);
    if (contactsCount === 0) {
      await db.guardianContacts.bulkAdd([
        { name: 'Primary Guardian (+919552970713)', phone: '+919552970713', relationship: 'Family', isPrimary: true },
      ]).catch(() => {});
    } else {
      // Auto-purge legacy test numbers (5550192) from existing browser IndexedDB
      const allContacts = await db.guardianContacts.toArray().catch(() => []);
      for (const c of allContacts) {
        if (c.phone.includes('+919552970713') || c.phone.includes('9473309705') || c.phone.includes('+919552970713')) {
          await db.guardianContacts.update(c.id!, { phone: '+919552970713', name: 'Primary Guardian (+919552970713)' }).catch(() => {});
        }
      }
    }

    const riskZonesCount = await db.riskZones.count().catch(() => 0);
    if (riskZonesCount === 0) {
      await db.riskZones.bulkAdd(DEFAULT_RISK_ZONES).catch(() => {});
    }

    const settingsCount = await db.appSettings.count().catch(() => 0);
    if (settingsCount === 0) {
      await db.appSettings.add({
        userName: 'Safety User',
        userPhone: '',
        customSosMessage: '🚨 EMERGENCY SOS ALERT!\nI need help immediately!\n\n📍 My Live GPS Location:\n{MAPS_URL}\n\n⚠️ Threat Level: {THREAT_LEVEL} ({THREAT_SCORE})\nReason: {REASON}',
        autoSendSms: true,
        autoSendWhatsapp: true
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Database initialization warning (using in-memory fallback):', err);
  }
}
