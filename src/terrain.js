// Analytisch hoogteveld voor het parcours: som van sinus-octaven waarbij per
// octaaf een hellingsbudget s_i wordt gebudgetteerd en de amplitude wordt
// afgeleid als a_i = s_i / k_i. Zo is de maximale helling by construction
// begrensd (~19%), onafhankelijk van de golflengte-jitter.
// Daarnaast een horizontaal bochtenveld x(z) met dezelfde budget-aanpak:
// curveAt geeft de laterale offset van de wegas, curveSlopeAt de koers dx/dz.
// Etappe-modus: een vast waypoint-profiel (stages.js) vervangt de octaven;
// er blijft een klein detail-octaaf overheen liggen zodat de weg niet
// spiegelglad tussen de waypoints hangt.
// GEEN three-import: deze module is puur wiskundig en in node testbaar.
import { RNG } from './rng.js';
import { profileHeight, profileSlope } from './stages.js';

// Hellingsbudget per octaaf (zie ontwerp): Σs_i = 0.195.
// Amplitudes NOOIT hardcoden — altijd afleiden als a = s / k.
const OCTAVES = [
  { lambda: 2600, s: 0.062 }, // col-golf: klimmen van honderden meters (~26 m amplitude)
  { lambda: 900, s: 0.045 }, // hoofdgolf: grote heuvels (~6.5 m amplitude)
  { lambda: 340, s: 0.040 },
  { lambda: 190, s: 0.030 },
  { lambda: 95, s: 0.018 }, // korte octaaf, pas actief via ramp B
];

// Bochtenbudget: s_i = max |dx/dz| per octaaf. Σs = 0.58 → worst-case koers
// ~30°, krapste bochtstraal ~115 m (zeldzaam: octaven moeten uitlijnen).
const CURVE_OCTAVES = [
  { lambda: 830, s: 0.30 },
  { lambda: 410, s: 0.18 },
  { lambda: 175, s: 0.10 },
];

const RAMP_A = [100, 550]; // vlak tot 100 m, volle amplitude al rond 550 m
const RAMP_B = [1200, 2100]; // extra korte octaaf "meer heuvels" na 1.2 km
const RAMP_C = [150, 800]; // bochten faden in na de rechte start

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// d/dx smoothstep = 6t(1-t) / (e1-e0)
function smoothstepSlope(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return (6 * t * (1 - t)) / (e1 - e0);
}

function makeOctaves(rng, defs) {
  return defs.map(({ lambda, s }) => {
    const l = lambda * (0.9 + rng.next() * 0.25);
    const k = (2 * Math.PI) / l;
    return { k, a: s / k, phi: rng.next() * Math.PI * 2 };
  });
}

// Detail bovenop een etappeprofiel: ~3% extra helling max, puur textuur.
const DETAIL_OCTAVES = [
  { lambda: 47, s: 0.030 },
  { lambda: 23, s: 0.012 },
];
const RAMP_D = [150, 300]; // detail fade-in na de vlakke start

export class Terrain {
  constructor(rng = new RNG((Math.random() * 2 ** 32) >>> 0), profile = null) {
    this.octaves = makeOctaves(rng, OCTAVES);
    this.curveOctaves = makeOctaves(rng, CURVE_OCTAVES);
    this.profile = profile;
    this.detail = profile ? makeOctaves(rng, DETAIL_OCTAVES) : null;
  }

  // Hoogte in meters; exact 0 voor z <= 100 (vlakke start) en alle z < 0.
  // De laatste (kortste) octaaf staat op ramp B: "meer heuvels" na 1.2 km.
  heightAt(z) {
    if (this.profile) {
      let h = profileHeight(this.profile, z);
      const D = smoothstep(RAMP_D[0], RAMP_D[1], z);
      if (D > 0) {
        for (const o of this.detail) h += D * o.a * Math.sin(o.k * z + o.phi);
      }
      return h;
    }
    if (z <= RAMP_A[0]) return 0;
    const A = smoothstep(RAMP_A[0], RAMP_A[1], z);
    const B = smoothstep(RAMP_B[0], RAMP_B[1], z);
    const os = this.octaves;
    const last = os.length - 1;
    let sum = 0;
    for (let i = 0; i <= last; i++) {
      sum += (i === last ? B : 1) * os[i].a * Math.sin(os[i].k * z + os[i].phi);
    }
    return A * sum;
  }

  // Analytische dh/dz (dimensieloos), incl. de ramp-afgeleiden:
  // h' = A'·[Σw·a·sin] + A·[Σw·a·k·cos + B'·a_n·sin_n]
  slopeAt(z) {
    if (this.profile) {
      let s = profileSlope(this.profile, z);
      const D = smoothstep(RAMP_D[0], RAMP_D[1], z);
      const dD = smoothstepSlope(RAMP_D[0], RAMP_D[1], z);
      if (D > 0 || dD > 0) {
        for (const o of this.detail) {
          const sn = Math.sin(o.k * z + o.phi);
          s += D * o.a * o.k * Math.cos(o.k * z + o.phi) + dD * o.a * sn;
        }
      }
      return s;
    }
    if (z <= RAMP_A[0]) return 0;
    const A = smoothstep(RAMP_A[0], RAMP_A[1], z);
    const dA = smoothstepSlope(RAMP_A[0], RAMP_A[1], z);
    const B = smoothstep(RAMP_B[0], RAMP_B[1], z);
    const dB = smoothstepSlope(RAMP_B[0], RAMP_B[1], z);
    const os = this.octaves;
    const last = os.length - 1;
    let sum = 0;
    let dsum = 0;
    for (let i = 0; i <= last; i++) {
      const o = os[i];
      const w = i === last ? B : 1;
      const sn = Math.sin(o.k * z + o.phi);
      sum += w * o.a * sn;
      dsum += w * o.a * o.k * Math.cos(o.k * z + o.phi);
      if (i === last) dsum += dB * o.a * sn;
    }
    return dA * sum + A * dsum;
  }

  // Laterale offset van de wegas in meters; exact 0 voor z <= 150.
  curveAt(z) {
    if (z <= RAMP_C[0]) return 0;
    const C = smoothstep(RAMP_C[0], RAMP_C[1], z);
    let sum = 0;
    for (const o of this.curveOctaves) sum += o.a * Math.sin(o.k * z + o.phi);
    return C * sum;
  }

  // Analytische dx/dz van de wegas (dimensieloos): x' = C'·Σ + C·Σ'.
  curveSlopeAt(z) {
    if (z <= RAMP_C[0]) return 0;
    const C = smoothstep(RAMP_C[0], RAMP_C[1], z);
    const dC = smoothstepSlope(RAMP_C[0], RAMP_C[1], z);
    let sum = 0;
    let dsum = 0;
    for (const o of this.curveOctaves) {
      sum += o.a * Math.sin(o.k * z + o.phi);
      dsum += o.a * o.k * Math.cos(o.k * z + o.phi);
    }
    return dC * sum + C * dsum;
  }
}
