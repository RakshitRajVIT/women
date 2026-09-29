export interface GuardianSyncState {
  userLocation: { lat: number; lng: number; accuracy: number; speed: number | null } | null;
  threatScore: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isSosActive: boolean;
  sosReason?: string;
  batteryLevel: number;
  isOnline: boolean;
  lastUpdated: string;
}

type GuardianEventCallback = (state: GuardianSyncState) => void;
type AlarmCommandCallback = (payload: { command: string; sender: string; timestamp: string }) => void;

class GuardianSyncService {
  private channel: BroadcastChannel | null = null;
  private stateCallbacks: GuardianEventCallback[] = [];
  private alarmCallbacks: AlarmCommandCallback[] = [];

  constructor() {
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('aegis_guardian_channel');
      this.channel.onmessage = (event) => {
        if (event.data?.type === 'STATE_UPDATE') {
          this.stateCallbacks.forEach((cb) => cb(event.data.payload));
        } else if (event.data?.type === 'GUARDIAN_COMMAND') {
          this.alarmCallbacks.forEach((cb) => cb(event.data.payload));
        }
      };
    }

    // Storage fallback for cross-tab sync
    window.addEventListener('storage', (e) => {
      if (e.key === 'aegis_guardian_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.stateCallbacks.forEach((cb) => cb(parsed));
        } catch (err) {
          console.error(err);
        }
      } else if (e.key === 'aegis_guardian_command' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.alarmCallbacks.forEach((cb) => cb(parsed));
        } catch (err) {
          console.error(err);
        }
      }
    });
  }

  // User publishes live state update to Guardian
  public publishState(state: GuardianSyncState) {
    if (this.channel) {
      this.channel.postMessage({ type: 'STATE_UPDATE', payload: state });
    }
    localStorage.setItem('aegis_guardian_state', JSON.stringify(state));
  }

  // Guardian sends command to User device (e.g. trigger siren, request ping)
  public sendGuardianCommand(command: 'TRIGGER_SIREN' | 'STOP_SIREN' | 'PING_LOCATION', sender = 'Guardian') {
    const payload = { command, sender, timestamp: new Date().toISOString() };
    if (this.channel) {
      this.channel.postMessage({ type: 'GUARDIAN_COMMAND', payload });
    }
    localStorage.setItem('aegis_guardian_command', JSON.stringify(payload));
  }

  public onStateUpdate(cb: GuardianEventCallback) {
    this.stateCallbacks.push(cb);
    // Return unsubscribe
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter((c) => c !== cb);
    };
  }

  public onGuardianCommand(cb: AlarmCommandCallback) {
    this.alarmCallbacks.push(cb);
    return () => {
      this.alarmCallbacks = this.alarmCallbacks.filter((c) => c !== cb);
    };
  }
}

export const guardianSyncService = new GuardianSyncService();
