export class AudioManager {
  context: AudioContext | null = null;
  master: GainNode | null = null;

  unlock() {
    if (this.context) {
      void this.context.resume();
      return;
    }
    if (typeof window === "undefined") return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    this.master = this.context.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.context.destination);
  }

  tone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.35, slide = 0) {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  play(name: string, enabled = true) {
    if (!enabled) return;
    this.unlock();
    const sounds: Record<string, () => void> = {
      start: () => { this.tone(170, 0.7, "sine", 0.4, 440); this.tone(340, 0.45, "triangle", 0.18, 220); },
      locked: () => this.tone(120, 0.18, "square", 0.16, -30),
      confirmed: () => { this.tone(520, 0.16, "sine", 0.22, 100); this.tone(760, 0.25, "sine", 0.16, 180); },
      fabric: () => this.tone(95, 0.4, "triangle", 0.12, 35),
      suit: () => { this.tone(80, 0.55, "sawtooth", 0.1, 40); this.tone(240, 0.18, "square", 0.08, -80); },
      helmet: () => { this.tone(440, 0.12, "square", 0.13, -120); this.tone(760, 0.24, "sine", 0.12, 30); },
      connector: () => { this.tone(190, 0.16, "square", 0.12, 80); this.tone(480, 0.2, "sine", 0.1, 140); },
      radio: () => { this.tone(260, 0.1, "square", 0.12, 50); this.tone(720, 0.14, "square", 0.08, -90); },
      tablet: () => { this.tone(620, 0.18, "sine", 0.14, 220); this.tone(900, 0.12, "sine", 0.1, 80); },
      cabinet: () => this.tone(75, 0.48, "sawtooth", 0.14, 25),
      tools: () => { this.tone(330, 0.08, "square", 0.12, -120); this.tone(220, 0.13, "triangle", 0.1, 40); },
      shield: () => this.tone(140, 0.65, "sine", 0.16, 360),
      hatch: () => { this.tone(65, 0.9, "sawtooth", 0.16, 80); this.tone(340, 0.22, "square", 0.08, -140); },
      countdown: () => this.tone(680, 0.13, "square", 0.12, -20),
      ignition: () => { this.tone(48, 2.8, "sawtooth", 0.42, -12); this.tone(82, 2.2, "square", 0.12, -18); },
      // New
      alarm: () => { this.tone(880, 0.22, "square", 0.16, -360); this.tone(660, 0.3, "square", 0.1, -240); },
      repair: () => { this.tone(210, 0.22, "square", 0.14, 120); this.tone(120, 0.3, "triangle", 0.12, 60); },
      thrust: () => this.tone(60, 0.4, "sawtooth", 0.14, 20),
      touchdown: () => { this.tone(55, 1.4, "sawtooth", 0.3, 18); this.tone(210, 0.5, "sine", 0.12, -90); },
      footstep: () => this.tone(95, 0.08, "triangle", 0.07, -25),
      plant: () => { this.tone(300, 0.2, "sine", 0.14, 180); this.tone(180, 0.24, "triangle", 0.1, 90); },
      harvest: () => { this.tone(420, 0.16, "sine", 0.18, 240); this.tone(680, 0.22, "sine", 0.14, 180); },
      water: () => { this.tone(320, 0.5, "sine", 0.1, 260); this.tone(180, 0.4, "triangle", 0.08, 120); },
      clean: () => { this.tone(520, 0.14, "triangle", 0.1, -180); this.tone(460, 0.18, "triangle", 0.08, -140); },
      alert: () => { this.tone(520, 0.2, "square", 0.14, -120); this.tone(300, 0.3, "square", 0.1, -80); },
      complete: () => { this.tone(320, 0.3, "sine", 0.24, 260); this.tone(520, 0.4, "sine", 0.2, 320); this.tone(760, 0.5, "triangle", 0.14, 180); },
    };
    (sounds[name] ?? sounds['confirmed']!)();
  }
}
