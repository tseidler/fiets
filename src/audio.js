// Kleine synth-geluidjes via WebAudio — geen externe assets nodig.
class SFX {
  constructor() {
    this.ctx = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur = 0.1, type = 'square', vol = 1, slideTo = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    g.gain.setValueAtTime(vol * 0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur = 0.3, vol = 1, cutoff = 800) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  pedal(alt) { this.tone(alt ? 660 : 570, 0.045, 'triangle', 0.45); }
  badPedal() { this.tone(180, 0.08, 'sawtooth', 0.25); }
  jump() { this.tone(300, 0.28, 'sine', 0.8, 760); }
  land() { this.noise(0.12, 0.5, 320); }
  crash() { this.noise(0.55, 1, 900); this.tone(190, 0.5, 'sawtooth', 0.6, 70); }
  count(go) { this.tone(go ? 880 : 440, go ? 0.45 : 0.13, 'square', 0.7); }
  select() { this.tone(520, 0.06, 'triangle', 0.5); }
  confirm() {
    this.tone(700, 0.1, 'triangle', 0.7);
    setTimeout(() => this.tone(1050, 0.16, 'triangle', 0.7), 90);
  }
  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.18, 'square', 0.55), i * 110)
    );
  }
}

export const sfx = new SFX();
