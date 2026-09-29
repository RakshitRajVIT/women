/* eslint-disable @typescript-eslint/no-explicit-any */
type DangerTriggerCallback = (type: 'VOICE' | 'MOTION' | 'LOCATION' | 'MANUAL', detail: string) => void;
type DecibelCallback = (db: number) => void;

export class AIDangerDetector {
  private isListeningVoice = false;
  private isListeningMotion = false;
  private recognition: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  private onTriggerCallbacks: DangerTriggerCallback[] = [];
  private onDbCallbacks: DecibelCallback[] = [];

  // Motion threshold tracker
  private lastShakeTime = 0;
  private shakeCount = 0;

  // 1. Voice Recognition & Decibel Monitoring
  public async startVoiceDetection(): Promise<boolean> {
    if (this.isListeningVoice) return true;

    // Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        const dangerKeywords = [
          'help', 'save me', 'danger', 'call police', 'emergency',
          'stop', 'don\'t touch', 'leave me alone', 'police', 'bachao', 'madad'
        ];

        this.recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            console.log('[Voice AI] Speech detected:', transcript);

            for (const keyword of dangerKeywords) {
              if (transcript.includes(keyword)) {
                console.warn('[Voice AI] Danger Keyword Triggered:', keyword);
                this.notifyTrigger('VOICE', `Voice distress keyword detected: "${keyword}"`);
                break;
              }
            }
          }
        };

        this.recognition.onerror = (e: any) => {
          console.warn('[Voice AI] Speech recognition error:', e.error);
        };

        this.recognition.onend = () => {
          if (this.isListeningVoice && this.recognition) {
            try {
              this.recognition.start();
            } catch (err) {
              console.error(err);
            }
          }
        };

        this.recognition.start();
        this.isListeningVoice = true;
      } catch (err) {
        console.warn('Speech recognition start error:', err);
      }
    }

    // Web Audio API Volume/Scream Meter
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtxClass();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      const buffer = new Float32Array(this.analyser.fftSize);

      const checkAudioLevel = () => {
        if (!this.analyser || !this.isListeningVoice) return;
        this.analyser.getFloatTimeDomainData(buffer);

        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          sumSquares += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sumSquares / buffer.length);
        // Convert RMS to estimated decibels (0 - 100 dB scale)
        const db = Math.min(100, Math.max(0, Math.round(20 * Math.log10(rms + 1e-6) + 90)));

        this.onDbCallbacks.forEach((cb) => cb(db));

        // Scream or sudden loud noise (> 82 dB)
        if (db > 82) {
          console.warn('[Voice AI] Scream / Loud audio spike detected:', db, 'dB');
          this.notifyTrigger('VOICE', `Scream or loud audio spike detected (${db} dB)`);
        }

        this.animationFrameId = requestAnimationFrame(checkAudioLevel);
      };

      this.isListeningVoice = true;
      checkAudioLevel();
      return true;
    } catch (err) {
      console.warn('Microphone stream access denied for audio analyzer:', err);
      return this.isListeningVoice;
    }
  }

  public stopVoiceDetection() {
    this.isListeningVoice = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error(e);
      }
      this.recognition = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // 2. Accelerometer Motion Detection
  public startMotionDetection() {
    if (this.isListeningMotion) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const totalAcc = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const now = Date.now();

      // Shake threshold (> 24 m/s^2)
      if (totalAcc > 24) {
        if (now - this.lastShakeTime < 1500) {
          this.shakeCount++;
          if (this.shakeCount >= 3) {
            console.warn('[Motion AI] Panic Shake Detected!');
            this.notifyTrigger('MOTION', 'Violent device shake detected multiple times');
            this.shakeCount = 0;
          }
        } else {
          this.shakeCount = 1;
        }
        this.lastShakeTime = now;
      }
    };

    if (window.DeviceMotionEvent) {
      // iOS permission check if needed
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        (DeviceMotionEvent as any).requestPermission().then((res: string) => {
          if (res === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
            this.isListeningMotion = true;
          }
        });
      } else {
        window.addEventListener('devicemotion', handleMotion);
        this.isListeningMotion = true;
      }
    }
  }

  // Manual Trigger Simulators (for testing on PCs / Web browser)
  public simulateTrigger(type: 'VOICE' | 'MOTION' | 'LOCATION' | 'MANUAL', detail: string) {
    this.notifyTrigger(type, detail);
  }

  public onTrigger(cb: DangerTriggerCallback) {
    this.onTriggerCallbacks.push(cb);
    return () => {
      this.onTriggerCallbacks = this.onTriggerCallbacks.filter((c) => c !== cb);
    };
  }

  public onDecibelChange(cb: DecibelCallback) {
    this.onDbCallbacks.push(cb);
    return () => {
      this.onDbCallbacks = this.onDbCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyTrigger(type: 'VOICE' | 'MOTION' | 'LOCATION' | 'MANUAL', detail: string) {
    this.onTriggerCallbacks.forEach((cb) => cb(type, detail));
  }

  public getIsVoiceActive() {
    return this.isListeningVoice;
  }
}

export const aiDangerDetector = new AIDangerDetector();
