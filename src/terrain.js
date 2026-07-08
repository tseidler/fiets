// Analytisch hoogteveld voor het parcours: som van sinus-octaven waarbij per
// octaaf een hellingsbudget s_i wordt gebudgetteerd en de amplitude wordt
// afgeleid als a_i = s_i / k_i. Zo is de maximale helling by construction
// begrensd (~15%), onafhankelijk van de golflengte-jitter.
// GEEN three-import: deze module is puur wiskundig en in node testbaar.
import { RNG } from './rng.js';

// Hellingsbudget per octaaf (zie ontwerp): Σs_i = 0.139.
// Amplitudes NOOIT hardcoden — altijd afleiden als a = s / k.
const OCTAVES = [
  { lambda: 900, s: 0.045 }, // lange hoofdgolf: grote heuvels (~6.5 m amplitude)
  { lambda: 340, s: 0.040 },
  { lambda: 190, s: 0.039 },
  { lambda: 95, s: 0.020 }, // korte octaaf, pas actief via ramp B
];

const RAMP_A = [100, 550]; // vlak tot 100 m, volle amplitude al rond 550 m
const RAMP_B = [1200, 2100]; // extra korte octaaf "meer heuvels" na 1.2 km

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// d/dx smoothstep = 6t(1-t) / (e1-e0)
function smoothstepSlope(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return (6 * t * (1 - t)) / (e1 - e0);
}

export class Terrain {
  constructor(rng = new RNG((Math.random() * 2 ** 32) >>> 0)) {
    this.octaves = OCTAVES.map(({ lambda, s }) => {
      const l = lambda * (0.9 + rng.next() * 0.25);
      const k = (2 * Math.PI) / l;
      return { k, a: s / k, phi: rng.next() * Math.PI * 2 };
    });
  }

  // Hoogte in meters; exact 0 voor z <= 150 (vlakke start) en alle z < 0.
  heightAt(z) {
    if (z <= RAMP_A[0]) return 0;
    const A = smoothstep(RAMP_A[0], RAMP_A[1], z);
    const B = smoothstep(RAMP_B[0], RAMP_B[1], z);
    const [o1, o2, o3, o4] = this.octaves;
    return A * (
      o1.a * Math.sin(o1.k * z + o1.phi) +
      o2.a * Math.sin(o2.k * z + o2.phi) +
      o3.a * Math.sin(o3.k * z + o3.phi) +
      B * (o4.a * Math.sin(o4.k * z + o4.phi))
    );
  }

  // Analytische dh/dz (dimensieloos), incl. de ramp-afgeleiden:
  // h' = A'·[Σa·sin + B·a4·sin4] + A·[Σa·k·cos + B'·a4·sin4 + B·a4·k4·cos4]
  slopeAt(z) {
    if (z <= RAMP_A[0]) return 0;
    const A = smoothstep(RAMP_A[0], RAMP_A[1], z);
    const dA = smoothstepSlope(RAMP_A[0], RAMP_A[1], z);
    const B = smoothstep(RAMP_B[0], RAMP_B[1], z);
    const dB = smoothstepSlope(RAMP_B[0], RAMP_B[1], z);
    const [o1, o2, o3, o4] = this.octaves;
    const s4 = Math.sin(o4.k * z + o4.phi);
    const sum =
      o1.a * Math.sin(o1.k * z + o1.phi) +
      o2.a * Math.sin(o2.k * z + o2.phi) +
      o3.a * Math.sin(o3.k * z + o3.phi) +
      B * o4.a * s4;
    const dsum =
      o1.a * o1.k * Math.cos(o1.k * z + o1.phi) +
      o2.a * o2.k * Math.cos(o2.k * z + o2.phi) +
      o3.a * o3.k * Math.cos(o3.k * z + o3.phi) +
      dB * o4.a * s4 +
      B * o4.a * o4.k * Math.cos(o4.k * z + o4.phi);
    return dA * sum + A * dsum;
  }
}
