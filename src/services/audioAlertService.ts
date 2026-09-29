class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private sirenOscillator: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isSirenPlaying = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play alarm siren (loud alternating high-low frequencies)
  public startSiren() {
    if (this.isSirenPlaying) return;
    try {
      const ctx = this.getAudioContext();
      this.sirenOscillator = ctx.createOscillator();
      this.sirenGain = ctx.createGain();

      this.sirenOscillator.type = 'sawtooth';
      this.sirenGain.gain.setValueAtTime(0.8, ctx.currentTime);

      // Frequency sweep (police/emergency siren effect)
      let high = true;
      const lfo = () => {
        if (!this.isSirenPlaying || !this.sirenOscillator) return;
        const now = ctx.currentTime;
        const freq = high ? 950 : 650;
        this.sirenOscillator.frequency.exponentialRampToValueAtTime(freq, now + 0.3);
        high = !high;
      };

      this.sirenOscillator.connect(this.sirenGain);
      this.sirenGain.connect(ctx.destination);
      this.sirenOscillator.start();
      this.isSirenPlaying = true;

      const intervalId = setInterval(() => {
        if (!this.isSirenPlaying) {
          clearInterval(intervalId);
        } else {
          lfo();
        }
      }, 350);
    } catch (e) {
      console.error('Failed to start siren:', e);
    }
  }

  public stopSiren() {
    this.isSirenPlaying = false;
    if (this.sirenOscillator) {
      try {
        this.sirenOscillator.stop();
        this.sirenOscillator.disconnect();
      } catch (e) {
        console.error(e);
      }
      this.sirenOscillator = null;
    }
  }

  // Beep countdown feedback
  public playCountdownBeep(freq = 880) {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.error(e);
    }
  }

  // Synthesize speech for fake emergency call or AI voice warning
  public speakAlert(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
}

export const audioAlertService = new AudioAlertService();
