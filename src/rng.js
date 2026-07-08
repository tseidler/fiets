// Deterministische pseudorandom-generator (mulberry32) met gescheiden streams.
// Eén seed per run; elk subsysteem krijgt zijn eigen fork zodat een replay met
// dezelfde seed altijd hetzelfde parcours geeft, onafhankelijk van speler-tempo.
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.next = mulberry32(this.seed);
  }

  range(a, b) { return a + this.next() * (b - a); }

  int(a, b) { return Math.floor(this.range(a, b + 1)); }

  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }

  chance(p) { return this.next() < p; }

  // Onafhankelijke sub-stream, puur op basis van seed + label (geen draws nodig).
  fork(label) {
    const r = new RNG((this.seed + Math.imul(label, 0x9E3779B9)) >>> 0);
    r.next();
    r.next();
    return r;
  }
}
