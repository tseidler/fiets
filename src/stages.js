// Etappes met een vast hoogteprofiel, geïnspireerd op echte Tour de
// France-profielen. Waypoints zijn [z_m, h_m] in SPELmaten: een echte etappe
// van ~180 km wordt ~5-6.5 km spel; hoogtes zijn zo geschaald dat hellingen
// op dezelfde 5-12% uitkomen als het gegenereerde terrein. De km-teller in de
// HUD rekent spelmeters terug naar "echte" kilometers (kmFactor).
// GEEN three-import: puur data + wiskunde, net als terrain.js node-testbaar.

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function smoothstepSlope(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return (6 * t * (1 - t)) / (e1 - e0);
}

// Binair zoeken naar het segment; profielen hebben ~20 waypoints.
function segment(profile, z) {
  let lo = 0;
  let hi = profile.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (profile[mid][0] <= z) lo = mid; else hi = mid;
  }
  return lo;
}

// Hoogte: smoothstep-interpolatie tussen waypoints (C1: helling 0 op elk
// waypoint, dus altijd vloeiende toppen en dalen). Buiten het profiel: vlak.
export function profileHeight(profile, z) {
  if (z <= profile[0][0]) return profile[0][1];
  const n = profile.length;
  if (z >= profile[n - 1][0]) return profile[n - 1][1];
  const i = segment(profile, z);
  const [z0, h0] = profile[i];
  const [z1, h1] = profile[i + 1];
  return h0 + (h1 - h0) * smoothstep(z0, z1, z);
}

export function profileSlope(profile, z) {
  if (z <= profile[0][0]) return 0;
  const n = profile.length;
  if (z >= profile[n - 1][0]) return 0;
  const i = segment(profile, z);
  const [z0, h0] = profile[i];
  const [z1, h1] = profile[i + 1];
  return (h1 - h0) * smoothstepSlope(z0, z1, z);
}

export const STAGES = [
  {
    id: 'tarragone',
    name: 'Tarragone → Barcelone',
    sub: 'Vlak — Catalonië',
    type: 'vlak',
    km: 178,
    dplus: 1800,
    length: 4750,
    // Lang vlak langs de kust, Côte de Begues halverwege, dan de drie korte
    // steile muurtjes van Montjuïc in de finale met aankomst bovenop.
    profile: [
      [0, 0], [150, 0], [450, 3], [750, 7], [950, 3], [1250, 9], [1550, 4],
      [1950, 11], [2350, 6], [2650, 24], [2950, 27], [3150, 12], [3400, 8],
      [3700, 31], [3950, 16], [4200, 33], [4400, 17], [4650, 36], [4750, 35],
    ],
  },
  {
    id: 'granollers',
    name: 'Granollers → Les Angles',
    sub: 'Bergrit — Pyreneeën',
    type: 'berg',
    km: 196,
    dplus: 3950,
    length: 6200,
    // Gestaag klimmend, de Col de Toses als scharnierpunt en een aankomst
    // op hoogte: het profiel eindigt bovenaan.
    profile: [
      [0, 0], [150, 0], [500, 8], [900, 22], [1200, 18], [1500, 26], [1800, 20],
      [2200, 28], [2600, 52], [3000, 68], [3300, 62], [3600, 42], [3900, 33],
      [4300, 45], [4700, 58], [5000, 52], [5300, 60], [5700, 72], [6000, 80], [6200, 82],
    ],
  },
  {
    id: 'malemort',
    name: 'Malemort → Ussel',
    sub: 'Heuvelrit — Corrèze',
    type: 'heuvel',
    km: 185,
    dplus: 3300,
    length: 5200,
    // Golvend van start tot finish met de Suc au May als uitschieter en een
    // stijgende basislijn richting Ussel.
    profile: [
      [0, 0], [150, 0], [400, 9], [650, 4], [900, 13], [1150, 7], [1400, 16],
      [1650, 9], [1900, 18], [2150, 11], [2400, 21], [2650, 14], [2900, 27],
      [3150, 18], [3400, 25], [3650, 17], [3900, 28], [4150, 20], [4400, 30],
      [4700, 23], [5000, 33], [5200, 30],
    ],
  },
  {
    id: 'mulhouse',
    name: 'Mulhouse → Le Markstein',
    sub: 'Bergrit — Vogezen',
    type: 'berg',
    km: 155,
    dplus: 3800,
    length: 6400,
    // Vier echte bergen: Grand Ballon, Col du Page, Ballon d'Alsace en de
    // slotklim naar Le Markstein.
    profile: [
      [0, 0], [150, 0], [450, 10], [800, 30], [1100, 48], [1400, 62], [1700, 50],
      [2000, 26], [2300, 18], [2600, 38], [2900, 54], [3100, 48], [3400, 30],
      [3700, 22], [4000, 42], [4300, 58], [4500, 50], [4800, 32], [5100, 26],
      [5500, 48], [5900, 66], [6200, 74], [6400, 72],
    ],
  },
];

// TdF-stijl mini-profiel (gele berg op donkere kaart) voor de etappekaartjes.
export function drawProfile(canvas, profile) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  g.clearRect(0, 0, W, H);
  const zMax = profile[profile.length - 1][0];
  let hMax = 10;
  for (const [, h] of profile) hMax = Math.max(hMax, h);
  const px = 4;
  g.beginPath();
  g.moveTo(px, H - 2);
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const z = (i / N) * zMax;
    const h = profileHeight(profile, z);
    g.lineTo(px + (i / N) * (W - 2 * px), H - 4 - (h / hMax) * (H - 14));
  }
  g.lineTo(W - px, H - 2);
  g.closePath();
  g.fillStyle = '#ffd600';
  g.fill();
  g.strokeStyle = '#0d1017';
  g.lineWidth = 1.5;
  g.stroke();
}
