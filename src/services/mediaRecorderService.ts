import { db, type EvidenceRecord } from './db';

class MediaRecorderService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private startTime = 0;

  // Request stream & start recording
  public async startEmergencyRecording(): Promise<boolean> {
    if (this.isRecording) return true;

    try {
      this.recordedChunks = [];
      this.startTime = Date.now();

      // Request both audio and camera video
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });

      // Prefer mp4 or webm supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every 1 second
      this.isRecording = true;
      console.log('Emergency recording started successfully:', mimeType);
      return true;
    } catch (err) {
      console.warn('Video + Audio media permission denied or unavailable, trying Audio only fallback:', err);
      try {
        // Fallback to audio only if webcam is denied or unavailable
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(this.mediaStream);
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };
        this.mediaRecorder.start(1000);
        this.isRecording = true;
        return true;
      } catch (audioErr) {
        console.error('Audio recording failed:', audioErr);
        return false;
      }
    }
  }

  // Stop recording & auto-save to IndexedDB
  public async stopEmergencyRecording(
    triggerReason: string,
    threatScore: number,
    location: { lat: number; lng: number }
  ): Promise<EvidenceRecord | null> {
    if (!this.isRecording || !this.mediaRecorder) return null;

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const videoBlob = new Blob(this.recordedChunks, { type: mimeType });
        const timestampStr = new Date().toISOString();
        const fileName = `evidence_${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;

        const record: EvidenceRecord = {
          timestamp: timestampStr,
          triggerReason,
          threatScore,
          lat: location.lat,
          lng: location.lng,
          videoBlob: videoBlob,
          durationSeconds: Math.max(1, durationSeconds),
          fileName
        };

        try {
          const id = await db.evidenceLogs.add(record);
          record.id = id as number;
          console.log('Evidence record saved to IndexedDB:', record);
        } catch (dbErr) {
          console.error('Failed to save evidence to DB:', dbErr);
        }

        // Clean up media streams
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;
        }

        this.isRecording = false;
        this.mediaRecorder = null;
        resolve(record);
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.error(e);
        this.isRecording = false;
        resolve(null);
      }
    });
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }
}

export const mediaRecorderService = new MediaRecorderService();
