// Web Audio API synthesizer for Luxury Classical Instrumental Ambient Music (Satie / Debussy inspired),
// Happy Birthday melody, and celebration chimes.

type ClassicalListener = (state: { isPlaying: boolean; isMuted: boolean }) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlayingMelody = false;
  private melodyTimeouts: number[] = [];

  // Classical ambient state
  private classicalActive = false;
  private classicalMuted = false;
  private classicalIntervalId: number | null = null;
  private classicalStep = 0;
  private listeners: Set<ClassicalListener> = new Set();
  private unlockBound = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private notifyListeners(): void {
    const isRunning = Boolean(
      this.classicalActive && !this.classicalMuted && this.ctx && this.ctx.state === 'running'
    );
    this.listeners.forEach((cb) =>
      cb({ isPlaying: isRunning, isMuted: this.classicalMuted })
    );
  }

  public subscribeClassical(cb: ClassicalListener): () => void {
    this.listeners.add(cb);
    this.notifyListeners();
    return () => {
      this.listeners.delete(cb);
    };
  }

  public initClassicalAutoplay(): void {
    if (typeof window === 'undefined') return;
    if (!this.classicalActive) {
      this.classicalActive = true;
      this.startClassicalLoop();
    }

    if (!this.unlockBound) {
      this.unlockBound = true;
      const unlock = () => {
        if (!this.ctx) {
          this.getContext();
        }
        if (this.ctx && this.ctx.state === 'suspended' && !this.classicalMuted) {
          this.ctx
            .resume()
            .then(() => {
              this.notifyListeners();
            })
            .catch(() => {});
        } else {
          this.notifyListeners();
        }
      };

      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('scroll', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
    }
  }

  public toggleClassicalMute(): boolean {
    const ctx = this.getContext();
    this.classicalMuted = !this.classicalMuted;

    if (!this.classicalMuted && ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => this.notifyListeners()).catch(() => {});
    }

    if (!this.classicalActive) {
      this.classicalActive = true;
      this.startClassicalLoop();
    }

    this.notifyListeners();
    return this.classicalMuted;
  }

  private playWarmPianoNote(
    freq: number,
    startTime: number,
    duration: number,
    volume: number
  ): void {
    if (!this.ctx || !this.masterGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const noteGain = this.ctx.createGain();

    // Warm felt-piano timbre using sine + soft triangle overtone passed through a low-pass filter
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.2, startTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, startTime + duration);

    const overtoneGain = this.ctx.createGain();
    overtoneGain.gain.setValueAtTime(0.12, startTime);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.6);

    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(volume, startTime + 0.08);
    noteGain.gain.exponentialRampToValueAtTime(volume * 0.45, startTime + duration * 0.35);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(overtoneGain);
    overtoneGain.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }

  private playVelvetStringPad(
    frequencies: number[],
    startTime: number,
    duration: number,
    volume: number
  ): void {
    if (!this.ctx || !this.masterGain) return;

    frequencies.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const padGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, startTime);

      padGain.gain.setValueAtTime(0.0001, startTime);
      padGain.gain.linearRampToValueAtTime(volume, startTime + duration * 0.35);
      padGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(filter);
      filter.connect(padGain);
      padGain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    });
  }

  private startClassicalLoop(): void {
    if (this.classicalIntervalId !== null) return;

    // Erik Satie - Gymnopédie No. 1 & Debussy Clair de Lune inspired slow luxury progression
    // Each measure is 3.2 seconds (slow 3/4 waltz cadence)
    const measures: Array<{
      bass: number;
      chord: number[];
      melody: Array<{ f: number; offset: number; dur: number }>;
    }> = [
      {
        // Gmaj7
        bass: 98.0, // G2
        chord: [196.0, 246.94, 293.66, 369.99], // G3, B3, D4, F#4
        melody: [
          { f: 587.33, offset: 0.9, dur: 2.1 }, // D5
          { f: 739.99, offset: 1.9, dur: 1.4 }, // F#5
        ],
      },
      {
        // Dmaj7
        bass: 73.42, // D2
        chord: [164.81, 220.0, 277.18, 329.63], // E3, A3, C#4, E4
        melody: [
          { f: 659.25, offset: 0.9, dur: 1.6 }, // E5
          { f: 587.33, offset: 1.9, dur: 1.4 }, // D5
        ],
      },
      {
        // Em9
        bass: 82.41, // E2
        chord: [196.0, 246.94, 293.66, 369.99], // G3, B3, D4, F#4
        melody: [
          { f: 493.88, offset: 0.85, dur: 1.5 }, // B4
          { f: 587.33, offset: 1.85, dur: 1.4 }, // D5
        ],
      },
      {
        // Bm7 / A6
        bass: 110.0, // A2
        chord: [164.81, 220.0, 277.18, 369.99], // E3, A3, C#4, F#4
        melody: [
          { f: 554.37, offset: 0.9, dur: 1.5 }, // C#5
          { f: 440.0, offset: 1.9, dur: 1.5 }, // A4
        ],
      },
      {
        // Cmaj7
        bass: 130.81, // C3
        chord: [196.0, 246.94, 329.63, 392.0], // G3, B3, E4, G4
        melody: [
          { f: 659.25, offset: 0.9, dur: 1.6 }, // E5
          { f: 783.99, offset: 1.95, dur: 1.3 }, // G5
        ],
      },
      {
        // Asus4 -> A7
        bass: 110.0, // A2
        chord: [164.81, 220.0, 293.66, 369.99], // E3, A3, D4, F#4
        melody: [
          { f: 739.99, offset: 0.9, dur: 1.5 }, // F#5
          { f: 659.25, offset: 1.95, dur: 1.4 }, // E5
        ],
      },
    ];

    const playMeasure = () => {
      const ctx = this.getContext();
      this.notifyListeners();

      if (!ctx || ctx.state !== 'running' || this.classicalMuted || this.isPlayingMelody) {
        return;
      }

      const now = ctx.currentTime;
      const m = measures[this.classicalStep % measures.length];
      this.classicalStep += 1;

      // Beat 1: Deep resonant bass note + ultra-soft string pad
      this.playWarmPianoNote(m.bass, now + 0.02, 3.0, 0.055);
      this.playVelvetStringPad(m.chord.slice(0, 3), now + 0.1, 3.1, 0.014);

      // Beat 2: Gently rolled arpeggiated chord
      m.chord.forEach((freq, idx) => {
        this.playWarmPianoNote(freq, now + 0.95 + idx * 0.075, 2.2, 0.028);
      });

      // Beat 2.5 & 3: Expressive lyrical top melody notes
      m.melody.forEach((note) => {
        this.playWarmPianoNote(note.f, now + note.offset, note.dur, 0.036);
      });
    };

    // Attempt first measure immediately
    window.setTimeout(playMeasure, 150);
    this.classicalIntervalId = window.setInterval(playMeasure, 3200);
  }

  public playSparkleChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440.0, 554.37, 659.25, 880.0]; // A4, C#5, E5, A5 warm major 7th

    notes.forEach((freq, idx) => {
      this.playWarmPianoNote(freq, now + idx * 0.075, 0.65, 0.06);
    });
  }

  public playCandleBlowSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.24;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(580, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    this.playWarmPianoNote(659.25, now + 0.06, 0.7, 0.05);
  }

  public toggleBirthdayMelody(onStateChange?: (playing: boolean) => void): boolean {
    if (this.isPlayingMelody) {
      this.stopBirthdayMelody(onStateChange);
      return false;
    }
    this.playBirthdayMelody(onStateChange);
    return true;
  }

  public stopBirthdayMelody(onStateChange?: (playing: boolean) => void): void {
    this.melodyTimeouts.forEach((id) => window.clearTimeout(id));
    this.melodyTimeouts = [];
    this.isPlayingMelody = false;
    onStateChange?.(false);
  }

  public playBirthdayMelody(onStateChange?: (playing: boolean) => void): void {
    const ctx = this.getContext();
    if (!ctx) return;

    this.stopBirthdayMelody();
    this.isPlayingMelody = true;
    onStateChange?.(true);

    const sequence: Array<{ f: number; d: number; gap?: number }> = [
      { f: 392.0, d: 340 },
      { f: 392.0, d: 240 },
      { f: 440.0, d: 520 },
      { f: 392.0, d: 520 },
      { f: 523.25, d: 520 },
      { f: 493.88, d: 950, gap: 180 },

      { f: 392.0, d: 340 },
      { f: 392.0, d: 240 },
      { f: 440.0, d: 520 },
      { f: 392.0, d: 520 },
      { f: 587.33, d: 520 },
      { f: 523.25, d: 950, gap: 180 },

      { f: 392.0, d: 340 },
      { f: 392.0, d: 240 },
      { f: 783.99, d: 520 },
      { f: 659.25, d: 520 },
      { f: 523.25, d: 520 },
      { f: 493.88, d: 520 },
      { f: 440.0, d: 880, gap: 180 },

      { f: 698.46, d: 340 },
      { f: 698.46, d: 240 },
      { f: 659.25, d: 520 },
      { f: 523.25, d: 520 },
      { f: 587.33, d: 520 },
      { f: 523.25, d: 1200 },
    ];

    let elapsed = 0;
    sequence.forEach((note) => {
      const timeoutId = window.setTimeout(() => {
        if (!this.isPlayingMelody || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.playWarmPianoNote(note.f, now, (note.d / 1000) * 1.35, 0.085);
        this.playWarmPianoNote(note.f * 0.5, now, (note.d / 1000) * 1.4, 0.03);
      }, elapsed);

      this.melodyTimeouts.push(timeoutId);
      elapsed += note.d + (note.gap || 65);
    });

    const endTimeout = window.setTimeout(() => {
      this.isPlayingMelody = false;
      onStateChange?.(false);
    }, elapsed + 150);
    this.melodyTimeouts.push(endTimeout);
  }
}

export const soundEngine = new SoundEngine();
