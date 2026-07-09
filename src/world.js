// De oneindige wereld: heuvelige weg- en graschunks, Tour de France-decor,
// zones ("parcours van de dag") en obstakels. Alles wordt hergebruikt
// (object pooling + Scrollers) zodat het parcours eindeloos is.
import * as THREE from 'three';

export const ROAD_W = 7;

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Asfalt mét ingebakken rand- en middenstrepen, spoorvorming, scheuren en
// reparatievlakken. Eén tile = 8 m weg (v-as), u-as beslaat de volle
// wegbreedte van 7 m — strepen kunnen dus nooit boven de heuvels zweven.
// Kleur- en bumpcanvas delen dezelfde korrel/scheur-geometrie zodat het
// reliëf klopt met wat je ziet.
function asphaltTextures() {
  const w = 512;
  const h = 1024;
  const colorC = document.createElement('canvas');
  colorC.width = w;
  colorC.height = h;
  const bumpC = document.createElement('canvas');
  bumpC.width = w;
  bumpC.height = h;
  const g = colorC.getContext('2d');
  const b = bumpC.getContext('2d');

  g.fillStyle = '#3d4045';
  g.fillRect(0, 0, w, h);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, w, h);

  // Spoorvorming: twee donkere banden waar de wielen rijden (zachte randen
  // door drie gestapelde translucente rects).
  for (const cx of [w * 0.3, w * 0.7]) {
    for (const [bw, al] of [[0.17, 0.05], [0.11, 0.06], [0.055, 0.07]]) {
      g.fillStyle = `rgba(18,20,24,${al})`;
      g.fillRect(cx - (w * bw) / 2, 0, w * bw, h);
    }
  }

  // Korrel op beide canvassen.
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const shade = 50 + Math.floor(Math.random() * 40);
    g.fillStyle = `rgba(${shade},${shade + 2},${shade + 6},0.5)`;
    g.fillRect(x, y, 2, 2);
    const bs = 105 + Math.floor(Math.random() * 60);
    b.fillStyle = `rgb(${bs},${bs},${bs})`;
    b.fillRect(x, y, 2, 2);
  }

  // Scheuren: gedeelde polylines (donker in kleur, diep in bump).
  for (let i = 0; i < 7; i++) {
    let x = Math.random() * w;
    let y = Math.random() * h;
    g.strokeStyle = 'rgba(18,19,22,0.55)';
    b.strokeStyle = 'rgb(44,44,44)';
    g.lineWidth = 1.6;
    b.lineWidth = 2.4;
    g.beginPath();
    b.beginPath();
    g.moveTo(x, y);
    b.moveTo(x, y);
    const segs = 4 + Math.floor(Math.random() * 4);
    for (let s = 0; s < segs; s++) {
      x += (Math.random() - 0.5) * 60;
      y += 20 + Math.random() * 46;
      g.lineTo(x, y);
      b.lineTo(x, y);
    }
    g.stroke();
    b.stroke();
  }

  // Reparatievlakken: donkerder vers asfalt, net iets verhoogd.
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * w * 0.8;
    const y = Math.random() * h * 0.9;
    const pw = 40 + Math.random() * 90;
    const ph = 60 + Math.random() * 140;
    g.fillStyle = 'rgba(28,30,34,0.35)';
    g.fillRect(x, y, pw, ph);
    b.fillStyle = 'rgb(140,140,140)';
    b.fillRect(x, y, pw, ph);
  }

  // Wegmarkering, licht versleten.
  g.fillStyle = '#e8e8e0';
  const edgeU = (0.2 / ROAD_W) * w; // randlijn-centrum op 0.2 m van de wegrand
  const edgeW = (0.12 / ROAD_W) * w;
  g.fillRect(edgeU - edgeW / 2, 0, edgeW, h);
  g.fillRect(w - edgeU - edgeW / 2, 0, edgeW, h);
  const dashW = (0.16 / ROAD_W) * w; // middenstreep: 1.4 m van elke 8 m
  g.fillRect(w / 2 - dashW / 2, 0, dashW, (1.4 / 8) * h);
  g.fillStyle = 'rgba(61,64,69,0.55)';
  for (let i = 0; i < 90; i++) {
    const lx = [edgeU, w - edgeU, w / 2][Math.floor(Math.random() * 3)];
    g.fillRect(lx - edgeW / 2 + Math.random() * edgeW, Math.random() * h, 2, 3);
  }

  const map = new THREE.CanvasTexture(colorC);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(bumpC); // bump blijft lineair (geen sRGB)
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = 4;
  return { map, bump };
}

// Gras met kleurvlekken, sprietjes en sporadische bloemetjes; alles wordt
// gewrapt getekend (9 kopieën) zodat de tile naadloos blijft.
function grassTexture() {
  const t = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#67a24c';
    g.fillRect(0, 0, w, h);
    const wrap = (fn, x, y) => {
      for (const dx of [0, -w, w]) for (const dy of [0, -h, h]) fn(x + dx, y + dy);
    };
    // Grote zachte kleurvlekken geven het veld diepte.
    const tints = ['#5c9743', '#72b258', '#568e3e', '#7cbd63', '#639b4a'];
    g.globalAlpha = 0.22;
    for (let i = 0; i < 70; i++) {
      g.fillStyle = tints[i % tints.length];
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 18 + Math.random() * 55;
      wrap((px, py) => {
        g.beginPath();
        g.arc(px, py, r, 0, Math.PI * 2);
        g.fill();
      }, x, y);
    }
    g.globalAlpha = 1;
    // Grassprieten: korte streepjes, licht en donker door elkaar.
    g.lineWidth = 1.2;
    for (let i = 0; i < 700; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 3 + Math.random() * 6;
      const lean = (Math.random() - 0.5) * 3;
      g.strokeStyle = Math.random() < 0.5 ? 'rgba(140,200,110,0.5)' : 'rgba(52,96,40,0.5)';
      wrap((px, py) => {
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + lean, py - len);
        g.stroke();
      }, x, y);
    }
    // Bloemetjes in de berm.
    const petals = ['#ffffff', '#ffe066', '#ff8fa3'];
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      g.fillStyle = petals[i % petals.length];
      wrap((px, py) => {
        g.beginPath();
        g.arc(px, py, 1.8, 0, Math.PI * 2);
        g.fill();
      }, x, y);
      g.fillStyle = '#c98a1b';
      wrap((px, py) => {
        g.beginPath();
        g.arc(px, py, 0.7, 0, Math.PI * 2);
        g.fill();
      }, x, y);
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function bannerTexture(text, style) {
  return canvasTexture(1024, 140, (g, w, h) => {
    if (style === 'flamme') {
      g.fillStyle = '#d81e05';
    } else if (style === 'polka' || style === 'arrivee') {
      g.fillStyle = '#ffffff';
    } else if (style === 'sprint') {
      g.fillStyle = '#27b04b';
    } else {
      g.fillStyle = '#ffd600';
    }
    g.fillRect(0, 0, w, h);
    if (style === 'arrivee') {
      // Geblokte finish-randen boven en onder.
      const s = 20;
      g.fillStyle = '#111111';
      for (let row = 0; row < 2; row++) {
        for (let x = 0; x < w / s; x++) {
          if ((x + row) % 2 === 0) {
            g.fillRect(x * s, row * s, s, s);
            g.fillRect(x * s, h - s * (row + 1), s, s);
          }
        }
      }
    }
    if (style === 'polka') {
      g.fillStyle = '#e02020';
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 22; x++) {
          g.beginPath();
          g.arc(x * 48 + 24 + (y % 2 ? 24 : 0), y * 48 + 24, 9, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(60, 20, w - 120, h - 40);
      g.fillStyle = '#c01818';
    } else {
      g.fillStyle = style === 'flamme' || style === 'sprint' ? '#ffffff' : '#111111';
    }
    if (style === 'arrivee') g.fillStyle = '#111111';
    g.font = 'bold 86px "Arial Black", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

function tricolorTexture() {
  return canvasTexture(96, 64, (g) => {
    g.fillStyle = '#0055a4'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#ffffff'; g.fillRect(32, 0, 32, 64);
    g.fillStyle = '#ef4135'; g.fillRect(64, 0, 32, 64);
  });
}

// Kasseien met lichtval per steen (kleur) en bolle stenen (bump): het reliëf
// verkoopt de sectie ook zonder geometrie.
function paveTextures() {
  const S = 512;
  const colorC = document.createElement('canvas');
  colorC.width = colorC.height = S;
  const bumpC = document.createElement('canvas');
  bumpC.width = bumpC.height = S;
  const g = colorC.getContext('2d');
  const b = bumpC.getContext('2d');
  g.fillStyle = '#43413d'; // voegen
  g.fillRect(0, 0, S, S);
  b.fillStyle = '#2a2a2a';
  b.fillRect(0, 0, S, S);
  const cell = S / 12;
  const rgb = (v) => {
    const n = Math.max(0, Math.min(255, Math.round(v)));
    return `rgb(${n},${n},${Math.min(255, n + 5)})`;
  };
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 13; x++) {
      const off = (y % 2) * (cell / 2);
      const px = x * cell + off - cell + 2 + Math.random() * 2;
      const py = y * cell + 2 + Math.random() * 2;
      const pw = cell - 5 - Math.random() * 3;
      const ph = cell - 5 - Math.random() * 3;
      const base = 96 + Math.floor(Math.random() * 44);
      // Steen met lichtval van boven.
      const grad = g.createLinearGradient(px, py, px, py + ph);
      grad.addColorStop(0, rgb(base + 30));
      grad.addColorStop(0.6, rgb(base));
      grad.addColorStop(1, rgb(base - 26));
      g.fillStyle = grad;
      g.beginPath();
      g.roundRect(px, py, pw, ph, 5);
      g.fill();
      // Bump: bolle steen, diepe voegen.
      const bg = b.createRadialGradient(px + pw / 2, py + ph / 2, 2, px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.62);
      bg.addColorStop(0, '#d8d8d8');
      bg.addColorStop(0.75, '#9a9a9a');
      bg.addColorStop(1, '#333333');
      b.fillStyle = bg;
      b.beginPath();
      b.roundRect(px, py, pw, ph, 5);
      b.fill();
    }
  }
  const map = new THREE.CanvasTexture(colorC);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(bumpC);
  bump.anisotropy = 4;
  return { map, bump };
}

// Kartonnen supportersborden — hoe schever en huiseliker, hoe beter.
const SIGN_TEXTS = [
  'ALLEZ\nOPI & OMI', 'GO TERRY\nGO !', 'CHAPEAU !', 'VENGA\nVENGA !',
  'PLUS VITE\nPAPA !', 'TERRY Nº 1',
];

function signTexture(lines) {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#e8d9b0'; // karton
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,95,55,0.8)';
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#232018';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const ls = lines.split('\n');
    g.font = `bold ${ls.length > 1 ? 34 : 40}px "Comic Sans MS", "Chalkboard SE", Arial, sans-serif`;
    ls.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (ls.length - 1) / 2) * 42, w - 24));
  });
}

// Rode rookpluim voor de fakkels (sprite, zachte radial falloff).
function smokeTexture() {
  const t = canvasTexture(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(242,64,48,0.9)');
    grad.addColorStop(0.55, 'rgba(220,52,44,0.45)');
    grad.addColorStop(1, 'rgba(200,40,40,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });
  return t;
}

// Gevel voor de dorpshuisjes: pleisterwerk, twee ramen met luiken en
// geraniums, en een deur tot aan de plint. Box-UV herhaalt de gevel op elke
// zijde — prima op bermafstand.
function houseTexture(wall, shutter) {
  return canvasTexture(256, 192, (g, w, h) => {
    g.fillStyle = wall;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.07;
    g.fillStyle = '#8a7a60';
    for (let i = 0; i < 40; i++) {
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 10, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(90,80,66,0.5)'; // plint
    g.fillRect(0, h - 18, w, 18);
    for (const cx of [64, 192]) {
      g.fillStyle = '#1d2430';
      g.fillRect(cx - 18, 46, 36, 46);
      g.strokeStyle = '#f5f2ea';
      g.lineWidth = 3;
      g.strokeRect(cx - 18, 46, 36, 46);
      g.beginPath();
      g.moveTo(cx, 46); g.lineTo(cx, 92);
      g.moveTo(cx - 18, 69); g.lineTo(cx + 18, 69);
      g.stroke();
      g.fillStyle = shutter;
      g.fillRect(cx - 30, 46, 11, 46);
      g.fillRect(cx + 19, 46, 11, 46);
      // Geraniums in de vensterbank.
      for (let i = 0; i < 5; i++) {
        g.fillStyle = i % 2 ? '#d8322a' : '#e85a52';
        g.beginPath();
        g.arc(cx - 14 + i * 7, 94, 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = shutter;
    g.fillRect(112, h - 64, 32, 46);
    g.fillStyle = '#e8d9b0';
    g.beginPath();
    g.arc(138, h - 42, 2.5, 0, Math.PI * 2); // deurknop
    g.fill();
  });
}

// Uithangbord van de frietkraam.
function foodSignTexture() {
  return canvasTexture(256, 80, (g, w, h) => {
    g.fillStyle = '#d81e05';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd600';
    g.lineWidth = 6;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#ffd600';
    g.font = '900 46px "Arial Black", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('FRITES', w / 2, h / 2 + 2);
  });
}

// Luifel van de camper: vrolijke oranje-witte strepen.
function awningTexture() {
  return canvasTexture(128, 64, (g, w, h) => {
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = '#f0813c';
      g.fillRect(x, 0, 16, h);
      g.fillStyle = '#f6efe2';
      g.fillRect(x + 16, 0, 16, h);
    }
  });
}

function barrierTexture() {
  return canvasTexture(512, 96, (g, w, h) => {
    g.fillStyle = '#e02020';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    for (let x = -h; x < w; x += 64) {
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + 32, 0);
      g.lineTo(x + 64, 0);
      g.lineTo(x + 32, h);
      g.fill();
    }
    g.fillStyle = '#111';
    g.font = 'bold 56px "Arial Black", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('ALLEZ !', w / 2, h / 2 + 2);
  });
}

// Verplaatst een vaste set objecten steeds vooruit zodra de speler ze passeert.
class Scroller {
  constructor(scene, count, spacing, makeFn, placeFn, startZ = 0) {
    this.spacing = spacing;
    this.total = count * spacing;
    this.placeFn = placeFn;
    this.items = [];
    for (let i = 0; i < count; i++) {
      const obj = makeFn(i);
      scene.add(obj);
      const z = startZ + i * spacing;
      placeFn(obj, z, i);
      this.items.push({ obj, z });
    }
  }

  update(playerZ, behind = 35) {
    for (const it of this.items) {
      if (it.z < playerZ - behind) {
        it.z += this.total;
        this.placeFn(it.obj, it.z);
      }
    }
  }
}

const ARCH_TEXTS = [
  ['TOUR DE FRANCE', 'tdf'],
  ['FLAMME ROUGE — 1 KM', 'flamme'],
  ['VIVE LE VÉLO', 'tdf'],
  ['ALLEZ ALLEZ ALLEZ', 'flamme'],
  ['SOUVENIR HENRI DESGRANGE', 'tdf'],
  ['CHAPEAU !', 'polka'],
];

const BERG_TEXTS = ['COL DU TERRY — 9%', 'MONT VENTOUX 12 KM', "ALPE D'HUEZ — 21 BOCHTEN", 'CÔTE DE BASISBEELD — 7%'];

// ─── Ambiance: gekozen bij runstart, middag = huidige look ───
export const AMBIANCES = [
  { id: 'middag', weight: 3, sky: 0x8ec9f0, fog: 0xbcd8ee, fogNear: 70, fogFar: 460, sun: 0xfff3d6, sunI: 1.7, sunPos: [25, 45, -15], hemiSky: 0xcfe4ff, hemiGnd: 0x4f7a3f, hemiI: 0.85 },
  { id: 'ochtend', weight: 2, sky: 0x9cc8e6, fog: 0xe3d3ae, fogNear: 60, fogFar: 420, sun: 0xffe2a8, sunI: 1.55, sunPos: [45, 26, -15], hemiSky: 0xf0e2c4, hemiGnd: 0x5a7a40, hemiI: 0.75 },
  { id: 'avond', weight: 2, sky: 0xf0a868, fog: 0xecb98e, fogNear: 65, fogFar: 400, sun: 0xffb26b, sunI: 1.45, sunPos: [-40, 22, -10], hemiSky: 0xffd2a4, hemiGnd: 0x6a5a38, hemiI: 0.70 },
  { id: 'grijs', weight: 1, sky: 0xb6c3cf, fog: 0xc4ced8, fogNear: 55, fogFar: 380, sun: 0xe9edf3, sunI: 0.95, sunPos: [20, 50, -10], hemiSky: 0xd2dae2, hemiGnd: 0x59704a, hemiI: 1.05 },
];

// ─── Zones: het parcours als lazy plan {type, start, end, fx} ───
export const ZONES = {
  etappe: { len: [500, 900], minDist: 0, weight: 5, fx: { w: {}, spacing: 1.0, cluster: 0.18 } },
  publiek: { len: [280, 460], minDist: 400, weight: 3, fx: { w: { barrier: 3, cones: 2, pave: 0 }, spacing: 0.9, cluster: 0.25 }, toast: 'PUBLIEKSHAAG !' },
  kasseien: { len: [180, 280], minDist: 800, weight: 2, fx: { w: { pave: 8, hay: 0.3, log: 0, barrier: 0, ducks: 0, banana: 0, pileup: 0, bear: 0 }, spacing: 0.3, cluster: 0 }, toast: 'SECTEUR PAVÉ !', banner: ['SECTEUR PAVÉ', 'polka'] },
  sprint: { len: [300, 450], minDist: 1200, weight: 1.5, fx: { w: { cones: 1.5, barrier: 0.5, log: 0, pave: 0 }, spacing: 1.6, cluster: 0, drag: 0.8 }, toast: 'SPRINT INTERMÉDIAIRE !', banner: ['SPRINT', 'sprint'] },
};
const SPECIALS = ['publiek', 'kasseien', 'sprint'];

// Alleen de course-stream schrijft (extend); iedereen leest via zoneAt.
class Course {
  constructor(rng) {
    this.rng = rng;
    this.zones = [{ type: 'etappe', start: 0, end: 600, fx: ZONES.etappe.fx, bannered: false }];
    this.cursor = 0;
    this.lastSpecial = null;
  }

  last() { return this.zones[this.zones.length - 1]; }

  extend() {
    const prev = this.last();
    let type = 'etappe';
    let len;
    if (prev.type !== 'etappe') {
      // Verplichte etappe-buffer na elke speciale zone.
      len = this.rng.range(250, 450);
    } else {
      // Gewogen keuze; etappe-gewicht daalt na verloop, nooit 2× dezelfde
      // speciale zone achtereen, minDist als introductie-trap.
      const etW = 5 - Math.min(1.5, (prev.end / 5000) * 1.5);
      let total = etW;
      for (const t of SPECIALS) {
        if (ZONES[t].minDist <= prev.end && t !== this.lastSpecial) total += ZONES[t].weight;
      }
      let roll = this.rng.next() * total - etW;
      if (roll > 0) {
        for (const t of SPECIALS) {
          if (ZONES[t].minDist > prev.end || t === this.lastSpecial) continue;
          roll -= ZONES[t].weight;
          if (roll <= 0) { type = t; break; }
        }
      }
      len = this.rng.range(ZONES[type].len[0], ZONES[type].len[1]);
      if (type !== 'etappe') this.lastSpecial = type;
    }
    this.zones.push({ type, start: prev.end, end: prev.end + len, fx: ZONES[type].fx, bannered: false });
  }

  // Meerdere lezers op verschillende z: cursor mag kort terugzoeken.
  zoneAt(z) {
    while (z >= this.last().end) this.extend();
    // Prune ver gepasseerde zones (readers spreiden max ~500 m rond de speler,
    // dus 800 m marge is veilig); houdt array en nextSpecialIn-scan O(1).
    while (this.zones.length > 2 && this.cursor > 0 && this.zones[1].end < z - 800) {
      this.zones.shift();
      this.cursor--;
    }
    let c = Math.min(this.cursor, this.zones.length - 1);
    while (c > 0 && this.zones[c].start > z) c--;
    while (this.zones[c].end <= z) c++;
    this.cursor = c;
    return this.zones[c];
  }

  // Eerste speciale zone met start in [a, b], anders null.
  nextSpecialIn(a, b) {
    while (this.last().end < b) this.extend();
    for (let i = 0; i < this.zones.length; i++) {
      const zn = this.zones[i];
      if (zn.start > b) break;
      if (zn.type !== 'etappe' && zn.start >= a) return zn;
    }
    return null;
  }
}

const OB_DEFS = {
  hay: { h: 0.8, d: 1.0, weight: 3, minDist: 0 },
  cones: { h: 0.5, d: 0.6, weight: 2, minDist: 0 },
  log: { h: 0.64, d: 0.7, weight: 2, minDist: 350 },
  barrier: { h: 0.85, d: 0.3, weight: 1.5, minDist: 700 },
  pave: { h: 0.05, d: 10, weight: 1.7, minDist: 500, pave: true },
  // De pretobstakels: overstekende eendjes, een bananenpak dat oversteekt en
  // valt, een valpartij van 3-5 renners en (heel af en toe) een beer.
  ducks: { h: 0.45, d: 0.9, weight: 1.6, minDist: 250 },
  banana: { h: 0.7, d: 0.6, weight: 1.2, minDist: 500 },
  pileup: { h: 0.75, d: 2.4, weight: 1.2, minDist: 700 },
  bear: { h: 0.88, d: 0.9, weight: 1.0, minDist: 900 },
};

class Obstacles {
  constructor(scene, rng, course, terrain) {
    this.scene = scene;
    this.rng = rng;
    this.course = course;
    this.terrain = terrain;
    this.active = [];
    this.pool = {};
    this.nextZ = 120;
    this.justClustered = false;
    const paveT = paveTextures();
    this.mats = {
      hay: new THREE.MeshStandardMaterial({ color: 0xd9b45b, roughness: 1 }),
      hayEnd: new THREE.MeshStandardMaterial({ color: 0xc29a3f, roughness: 1 }),
      log: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
      logEnd: new THREE.MeshStandardMaterial({ color: 0xa8845c, roughness: 0.9 }),
      cone: new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.7 }),
      barrier: new THREE.MeshStandardMaterial({ map: barrierTexture(), roughness: 0.8 }),
      pave: new THREE.MeshStandardMaterial({ map: paveT.map, bumpMap: paveT.bump, bumpScale: 0.5, roughness: 1 }),
      post: new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 }),
      // Pretobstakels (gedeeld, zodat gepoolde objecten niets lekken)
      fur: new THREE.MeshStandardMaterial({ color: 0x7a4a26, roughness: 1 }),
      furDark: new THREE.MeshStandardMaterial({ color: 0x5b3319, roughness: 1 }),
      snout: new THREE.MeshStandardMaterial({ color: 0xcfa06a, roughness: 0.9 }),
      duckY: new THREE.MeshStandardMaterial({ color: 0xf7d354, roughness: 0.8 }),
      duckW: new THREE.MeshStandardMaterial({ color: 0xfdf6da, roughness: 0.8 }),
      beak: new THREE.MeshStandardMaterial({ color: 0xf07818, roughness: 0.7 }),
      banana: new THREE.MeshStandardMaterial({ color: 0xffd93b, roughness: 0.65 }),
      suit: new THREE.MeshStandardMaterial({ color: 0x2b2417, roughness: 0.9 }),
      lycra: new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.8 }),
      jerseys: [0xd62828, 0x1e50c8, 0x27b04b, 0xeceff4, 0xf77f00].map(
        (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })
      ),
    };
  }

  build(id) {
    const g = new THREE.Group();
    g.rotation.order = 'YXZ'; // eerst yaw (bocht), dan pitch (kasseienstrip op helling)
    if (id === 'hay') {
      for (const x of [-2.2, 0, 2.2]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 1.0), this.mats.hay);
        b.position.set(x, 0.4, 0);
        g.add(b);
        const band = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.82, 0.2), this.mats.hayEnd);
        band.position.set(x, 0.4, 0);
        g.add(band);
      }
    } else if (id === 'log') {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, ROAD_W + 0.4, 12), this.mats.log);
      log.rotation.z = Math.PI / 2;
      log.position.y = 0.32;
      g.add(log);
      for (const s of [-1, 1]) {
        const end = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 12), this.mats.logEnd);
        end.rotation.z = Math.PI / 2;
        end.position.set(s * (ROAD_W / 2 + 0.2), 0.32, 0);
        g.add(end);
      }
    } else if (id === 'cones') {
      for (let i = 0; i < 6; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.5, 10), this.mats.cone);
        cone.position.set(-ROAD_W / 2 + 0.8 + i * (ROAD_W - 1.6) / 5, 0.25, (i % 2) * 0.3);
        g.add(cone);
      }
    } else if (id === 'barrier') {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W - 0.4, 0.7, 0.12), this.mats.barrier);
      panel.position.y = 0.6;
      g.add(panel);
      for (const x of [-2.8, 0, 2.8]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.08), this.mats.post);
        post.position.set(x, 0.48, 0);
        g.add(post);
      }
    } else if (id === 'pave') {
      // Dikke strip (0.24, top op +0.08): max sagitta over ±5 m is ~0.05 en de
      // weg ligt 0.02 hoger — marge 0.06 houdt de strip overal boven het asfalt.
      const strip = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 0.24, 10), this.mats.pave);
      strip.position.y = -0.04;
      g.add(strip);
    } else if (id === 'ducks') {
      // Moeder eend + vier kuikens, gebouwd kijkend naar +x; de actor-groep
      // waggelt in update() heen en weer over de weg.
      const actor = new THREE.Group();
      g.userData.actor = actor;
      g.userData.ducks = [];
      for (let i = 0; i < 5; i++) {
        const duck = new THREE.Group();
        const big = i === 0;
        const bodyMat = big ? this.mats.duckW : this.mats.duckY;
        const s = big ? 1 : 0.55;
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 9, 7), bodyMat);
        body.scale.set(1.35, 1, 1);
        body.position.y = 0.17 * s;
        duck.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 8, 6), bodyMat);
        head.position.set(0.16 * s, 0.36 * s, 0);
        duck.add(head);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035 * s, 0.09 * s, 6), this.mats.beak);
        beak.rotation.z = -Math.PI / 2;
        beak.position.set(0.27 * s, 0.35 * s, 0);
        duck.add(beak);
        duck.position.x = -i * 0.42; // kuikens dribbelen achter mama aan
        actor.add(duck);
        g.userData.ducks.push(duck);
      }
      g.add(actor);
    } else if (id === 'banana') {
      // Persoon in bananenpak, pivot bij de voeten (valt om rond de origin).
      const actor = new THREE.Group();
      g.userData.actor = actor;
      const suit = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.7, 4, 10), this.mats.banana);
      suit.scale.set(0.8, 1, 0.62);
      suit.position.y = 0.72;
      suit.rotation.z = 0.16; // kenmerkende bananenkromming
      actor.add(suit);
      // Gezichtsgat + armen + benen in het zwart.
      const face = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), this.mats.suit);
      face.scale.set(1, 1.25, 0.5);
      face.position.set(0.03, 0.95, -0.13); // gezicht naar de naderende renner
      actor.add(face);
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.24, 3, 6), this.mats.suit);
        arm.position.set(s * 0.24, 0.78, 0);
        arm.rotation.z = -s * 1.9; // armen wijd — rennen!
        actor.add(arm);
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 3, 6), this.mats.suit);
        leg.position.set(s * 0.08, 0.17, 0);
        actor.add(leg);
      }
      g.add(actor);
    } else if (id === 'pileup') {
      // Valpartij: 3-5 gevallen renners met fietsen plat op het asfalt.
      const n = 3 + Math.floor(this.rng.next() * 3);
      for (let i = 0; i < n; i++) {
        const u = new THREE.Group();
        const jer = this.mats.jerseys[Math.floor(this.rng.next() * this.mats.jerseys.length)];
        // Fiets op zijn kant: twee platte wielen + framebuis.
        for (const [wx, wz] of [[0.34, 0], [-0.34, 0.14]]) {
          const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 20), this.mats.lycra);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 0.05, wz);
          u.add(wheel);
        }
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.07), jer);
        frame.position.set(0, 0.08, 0.06);
        frame.rotation.y = 0.25;
        u.add(frame);
        // Renner plat naast de fiets, benen gebogen.
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.36, 3, 8), jer);
        body.rotation.z = Math.PI / 2;
        body.rotation.y = this.rng.range(-0.5, 0.5);
        body.position.set(0.1, 0.13, 0.5);
        u.add(body);
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), this.mats.jerseys[(i + 2) % this.mats.jerseys.length]);
        helmet.position.set(0.42, 0.11, 0.55);
        u.add(helmet);
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 3, 6), this.mats.lycra);
        leg.rotation.z = Math.PI / 2 - 0.5;
        leg.position.set(-0.25, 0.16, 0.55);
        u.add(leg);
        u.position.set(-2.3 + (i * 4.6) / Math.max(1, n - 1) + this.rng.range(-0.3, 0.3), 0, this.rng.range(-0.9, 0.9));
        u.rotation.y = this.rng.next() * Math.PI * 2;
        g.add(u);
      }
    } else if (id === 'bear') {
      // Beer op vier poten, licht schuin naar de naderende renner gedraaid.
      const bear = new THREE.Group();
      bear.rotation.y = -0.5;
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), this.mats.fur);
      body.scale.set(0.8, 0.65, 1.15);
      body.position.y = 0.52;
      bear.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), this.mats.fur);
      head.position.set(0, 0.76, -0.52); // kop naar -z: kijkt de renner aan
      bear.add(head);
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), this.mats.snout);
      snout.scale.set(1, 0.8, 1.1);
      snout.position.set(0, 0.7, -0.7);
      bear.add(snout);
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), this.mats.furDark);
        ear.position.set(s * 0.16, 0.95, -0.47);
        bear.add(ear);
        for (const zz of [-0.34, 0.36]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.42, 8), this.mats.furDark);
          leg.position.set(s * 0.24, 0.21, zz);
          bear.add(leg);
        }
      }
      g.add(bear);
    }
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }

  spawn(z, dist, fx, time) {
    const ids = Object.keys(OB_DEFS).filter((id) =>
      OB_DEFS[id].minDist <= dist &&
      (fx.w[id] ?? 1) > 0 &&
      !(this.justClustered && id === 'barrier') // hek nooit als cluster-tweede
    );
    if (!ids.length) ids.push('cones');
    const totalW = ids.reduce((s, id) => s + OB_DEFS[id].weight * (fx.w[id] ?? 1), 0);
    let roll = this.rng.next() * totalW;
    let id = ids[0];
    for (const cand of ids) {
      roll -= OB_DEFS[cand].weight * (fx.w[cand] ?? 1);
      if (roll <= 0) { id = cand; break; }
    }
    const def = OB_DEFS[id];
    this.pool[id] = this.pool[id] || [];
    const obj = this.pool[id].pop() ?? this.build(id);
    const oy = this.terrain.heightAt(z);
    obj.position.set(this.terrain.curveAt(z), oy, z);
    // Dwars op de bochtige wegas; volledige reset omdat objecten gepoold zijn.
    obj.rotation.set(
      def.pave ? -Math.atan(this.terrain.slopeAt(z)) : 0,
      Math.atan(this.terrain.curveSlopeAt(z)),
      0
    );
    this.scene.add(obj);
    // t0: spawn-tijd voor de geanimeerde obstakels (eendjes, bananenpak);
    // pooled hergebruik herstart zo vanzelf hun act.
    this.active.push({ id, obj, z, h: def.h, d: def.d, pave: !!def.pave, counted: false, oy, t0: time });
    return def;
  }

  // Eendjes waggelen heen en weer over de weg, kuikens achter mama aan.
  animDucks(o, time) {
    const tt = time - o.t0;
    const per = 12;
    const ph = (tt % per) / per;
    const fwd = ph < 0.5;
    const lin = fwd ? ph * 2 : (1 - ph) * 2;
    const a = o.obj.userData.actor;
    a.position.x = -2.8 + lin * 5.6;
    a.rotation.y = fwd ? 0 : Math.PI;
    const ducks = o.obj.userData.ducks;
    for (let i = 0; i < ducks.length; i++) {
      ducks[i].position.y = Math.abs(Math.sin(time * 7 + i * 1.1)) * 0.06;
      ducks[i].rotation.x = Math.sin(time * 7 + i * 1.1) * 0.12;
    }
  }

  // Bananenpak rent de weg over, struikelt en blijft liggen (pivot bij de
  // voeten, dus de val draait om de origin).
  animBanana(o, time) {
    const a = o.obj.userData.actor;
    const age = time - o.t0;
    const WALK = 2.4;
    const FALL = 0.4;
    if (age < WALK) {
      a.position.x = -4.6 + (age / WALK) * 5.5;
      a.rotation.z = Math.sin(time * 10) * 0.14; // rent waggelend over
    } else {
      const f = Math.min(1, (age - WALK) / FALL);
      a.position.x = 0.9 + f * 0.2;
      a.rotation.z = -f * (Math.PI / 2 - 0.06) + (f >= 1 ? Math.sin(time * 2.2) * 0.015 : 0);
    }
  }

  update(playerZ, time) {
    while (this.nextZ < playerZ + 320) {
      const zone = this.course.zoneAt(this.nextZ);
      const def = this.spawn(this.nextZ, playerZ, zone.fx, time);
      const base = 110 - Math.min(62, (playerZ / 5000) * 62); // de enige dichtheidsbron
      if (!def.pave && !this.justClustered && this.rng.chance(zone.fx.cluster * Math.min(1, playerZ / 3000))) {
        this.nextZ += def.d + this.rng.range(15, 22); // cluster: 2e obstakel kort erna
        this.justClustered = true;
      } else {
        this.nextZ += def.d + base * zone.fx.spacing * this.rng.range(0.7, 1.3);
        this.justClustered = false;
      }
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      if (o.z < playerZ - 25) {
        this.scene.remove(o.obj);
        this.pool[o.id].push(o.obj);
        this.active.splice(i, 1);
      }
    }
    // Levende obstakels animeren (na spawn/despawn, dus alleen actieve).
    for (const o of this.active) {
      if (o.id === 'ducks') this.animDucks(o, time);
      else if (o.id === 'banana') this.animBanana(o, time);
    }
  }

  // Gepoolde obstakels staan buiten de scene en ontsnappen aan
  // disposeObject(scene); hier expliciet opruimen (materialen incl. maps).
  dispose() {
    for (const list of Object.values(this.pool)) {
      for (const obj of list) {
        obj.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
        });
      }
    }
    for (const m of Object.values(this.mats)) {
      for (const mm of Array.isArray(m) ? m : [m]) {
        if (mm.map) mm.map.dispose();
        if (mm.bumpMap) mm.bumpMap.dispose();
        mm.dispose();
      }
    }
  }
}

export class World {
  constructor(scene, rng, ambiance, terrain, stage = null) {
    this.scene = scene;
    this.terrain = terrain;
    this.wavers = [];
    this.flares = []; // rode-rook-fakkels in het publiek, geanimeerd in update()
    this.smokeTex = smokeTexture();
    this.signTexes = SIGN_TEXTS.map((t) => signTexture(t));

    // Gescheiden streams: decor mag op wrap-momenten trekken zonder de
    // gameplay-reeks (course/obstakels) te verstoren.
    const decorRng = rng.fork(1);
    this.rand = (a, b) => decorRng.range(a, b);
    this.pick = (arr) => decorRng.pick(arr);
    const rand = this.rand;
    const pick = this.pick;
    const courseRng = rng.fork(2);
    this.course = new Course(courseRng.fork(101));

    scene.background = new THREE.Color(ambiance.sky);
    scene.fog = new THREE.Fog(ambiance.fog, ambiance.fogNear, ambiance.fogFar);
    this.cloudColor = ambiance.id === 'grijs' ? 0xe8ecf0 : 0xffffff;

    // ── Wereld-statische weg- en graschunks die het hoogteveld volgen ──
    // De weg volgt óók de bochtige wegas x(z) (curved-vlag); het gras is
    // 500 m breed rond x=0 en hoeft dus niet mee te buigen (max offset ±55 m).
    const asph = asphaltTextures();
    const roadMat = new THREE.MeshStandardMaterial({ map: asph.map, bumpMap: asph.bump, bumpScale: 0.15, roughness: 0.95 });
    const grassMat = new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 });
    const placeChunk = (mesh, z) => {
      mesh.position.z = z + 30;
      this.refillChunk(mesh);
    };
    this.roadChunks = new Scroller(scene, 9, 60, () => this.makeChunk(ROAD_W, 60, roadMat, 0.02, false, true), placeChunk, -120);
    this.grassChunks = new Scroller(scene, 9, 60, () => this.makeChunk(500, 30, grassMat, 0, true, false), placeChunk, -120);

    this.buildMountains();
    this.buildClouds();

    // Bomen en struiken langs de route
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x2d6a34, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f9a3f, roughness: 1 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3d7a33, roughness: 1 });
    this.trees = new Scroller(scene, 28, 22,
      () => {
        const t = new THREE.Group();
        const kind = rand(0, 1);
        if (kind < 0.22) {
          // Struik: cluster lage bollen, geen stam.
          for (let i = 0; i < 3; i++) {
            const blob = new THREE.Mesh(new THREE.SphereGeometry(rand(0.35, 0.55), 8, 6), bushMat);
            blob.scale.y = 0.75;
            blob.position.set(rand(-0.35, 0.35), rand(0.2, 0.4), rand(-0.35, 0.35));
            blob.castShadow = true;
            t.add(blob);
          }
          return t;
        }
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 7), trunkMat);
        trunk.position.y = 0.6;
        trunk.castShadow = true;
        t.add(trunk);
        if (kind < 0.61) {
          for (let i = 0; i < 3; i++) {
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9 - i * 0.22, 1.0, 8), pineMat);
            cone.position.y = 1.3 + i * 0.62;
            cone.castShadow = true;
            t.add(cone);
          }
        } else {
          const blob = new THREE.Mesh(new THREE.SphereGeometry(0.95, 9, 7), leafMat);
          blob.position.y = 1.9;
          blob.castShadow = true;
          t.add(blob);
        }
        return t;
      },
      (obj, z) => {
        const side = rand(0, 1) < 0.5 ? -1 : 1;
        const zf = z + rand(-6, 6); // hoogte altijd op de finale z na jitter
        obj.position.set(side * rand(6, 26) + this.terrain.curveAt(zf), this.terrain.heightAt(zf) - 0.05, zf);
        const s = rand(0.8, 1.6);
        obj.scale.set(s, s, s);
      }
    );

    // Hoog berm-gras: instanced pollen vlak langs de wegrand. De patch is
    // 8 m lang en draait met de bocht mee, anders steken de uiteinden bij
    // een krappe bocht de weg op.
    this.grassTufts = new Scroller(scene, 10, 32,
      () => this.makeGrassTuft(),
      (obj, z) => {
        const zf = z + rand(-8, 8);
        const side = rand(0, 1) < 0.5 ? -1 : 1;
        obj.position.set(side * rand(4.7, 6.5) + this.terrain.curveAt(zf), this.terrain.heightAt(zf) - 0.02, zf);
        obj.rotation.y = Math.atan(this.terrain.curveSlopeAt(zf));
        obj.rotation.x = -Math.atan(this.terrain.slopeAt(zf));
      }
    );

    // Dorpshuisjes: af en toe een Frans huis of gehuchtje langs de route.
    this.houses = new Scroller(scene, 5, 190,
      () => this.makeHouse(),
      (obj, z) => {
        const zf = z + rand(-45, 45);
        const side = rand(0, 1) < 0.5 ? -1 : 1;
        obj.visible = rand(0, 1) < 0.72;
        // 0.55 m ingegraven fundering: het terrein loopt onder de voetprint
        // door (helling ≤ 19% × halve diepte) en mag geen kier tonen.
        obj.position.set(side * rand(9.5, 17) + this.terrain.curveAt(zf), this.terrain.heightAt(zf) - 0.55, zf);
        obj.rotation.y = Math.atan(this.terrain.curveSlopeAt(zf)) + rand(-0.35, 0.35) + (side > 0 ? Math.PI : 0);
      },
      120
    );

    // Campers en foodtrucks van fans, geparkeerd in de berm — vooral op de
    // klimmen en bij publiekszones, zoals het hoort bij de Tour.
    this.vehicles = new Scroller(scene, 4, 290,
      (i) => (i % 2 === 0 ? this.makeCamper() : this.makeFoodTruck()),
      (obj, z) => {
        const zf = z + rand(-60, 60);
        const side = rand(0, 1) < 0.5 ? -1 : 1;
        obj.visible = this.terrain.slopeAt(zf) > 0.03 ||
          this.course.zoneAt(zf).type === 'publiek' || rand(0, 1) < 0.4;
        obj.position.set(side * rand(8.5, 12) + this.terrain.curveAt(zf), this.terrain.heightAt(zf) - 0.3, zf);
        // Luifel/loket is op +x gebouwd; draai hem naar de weg toe.
        obj.rotation.y = Math.atan(this.terrain.curveSlopeAt(zf)) + rand(-0.25, 0.25) + (side > 0 ? Math.PI : 0);
        obj.rotation.x = -Math.atan(this.terrain.slopeAt(zf));
      },
      200
    );

    // Zonnebloemvelden (gecentreerd gebouwd zodat de tilt rond het midden draait)
    this.sunflowers = new Scroller(scene, 4, 170,
      () => this.makeSunflowerPatch(),
      (obj, z) => {
        const side = rand(0, 1) < 0.5 ? -1 : 1;
        // Patch is gecentreerd gebouwd (±3.6 m breed): centrum ≥ 8 m houdt de
        // dichtstbijzijnde bloem ruim van de wegrand (3.5 m).
        obj.position.set(side * rand(8, 14) + this.terrain.curveAt(z), this.terrain.heightAt(z) - 0.05, z);
        obj.rotation.x = -Math.atan(this.terrain.slopeAt(z));
      }
    );

    // Juichend publiek met Franse vlaggen. Veel dichter op elkaar dan vroeger;
    // op klimmen (Tour-traditie) staat iederéén langs de weg, op vlakke
    // stukken dunt de haag uit via de visible-vlag.
    this.flagTex = tricolorTexture();
    this.spectators = new Scroller(scene, 10, 45,
      () => this.makeCrowd(),
      (obj, z) => {
        const side = rand(0, 1) < 0.5 ? -1 : 1;
        const zf = z + rand(-8, 8);
        const climb = this.terrain.slopeAt(zf) > 0.035;
        const inPubliek = this.course.zoneAt(zf).type === 'publiek';
        obj.visible = climb || inPubliek || rand(0, 1) < 0.55;
        // Fakkels: bijna altijd in publiekszones, op klimmen de helft.
        if (obj.userData.flare) {
          obj.userData.flare.visible = inPubliek ? rand(0, 1) < 0.85 : climb && rand(0, 1) < 0.5;
        }
        obj.position.set(
          side * (climb ? rand(4.2, 5.2) : rand(4.3, 6.4)) + this.terrain.curveAt(zf),
          this.terrain.heightAt(zf) - 0.05,
          zf
        );
        obj.rotation.x = -Math.atan(this.terrain.slopeAt(zf));
      },
      40
    );

    // Publiekshaag: dichte rijen die alleen zichtbaar zijn in publiekszones.
    // Bij een haag hoort bijna altijd rode fakkelrook.
    this.hedges = new Scroller(scene, 12, 12,
      () => this.makeHedgeRow(),
      (obj, z) => {
        obj.visible = this.course.zoneAt(z).type === 'publiek';
        for (const fl of obj.userData.flares) fl.visible = rand(0, 1) < 0.85;
        obj.position.set(this.terrain.curveAt(z), this.terrain.heightAt(z) - 0.05, z);
        obj.rotation.y = Math.atan(this.terrain.curveSlopeAt(z));
        obj.rotation.x = -Math.atan(this.terrain.slopeAt(z));
      }
    );

    // Spandoek-bogen over de weg; snappen (alleen vooruit) naar zonestarts.
    this.arches = new Scroller(scene, 3, 420,
      (i) => this.makeArch(i),
      (obj, z) => {
        let zf = z;
        const zs = this.course.nextSpecialIn(z, z + 180);
        const banner = zs && !zs.bannered ? ZONES[zs.type].banner : null;
        if (banner && zs.start - 4 > z) {
          zs.bannered = true; // maximaal één boog per zone
          zf = zs.start - 4;
          this.applyBanner(obj, banner[0], banner[1]);
        } else {
          obj.userData.textIndex = (obj.userData.textIndex + 3) % ARCH_TEXTS.length;
          this.setArchText(obj, obj.userData.textIndex);
        }
        obj.position.set(this.terrain.curveAt(zf), this.terrain.heightAt(zf) - 0.05, zf);
        obj.rotation.y = Math.atan(this.terrain.curveSlopeAt(zf));
      },
      45
    );
    // Eerste boog is altijd het Grand Départ
    this.setArchText(this.arches.items[0].obj, -1);

    // Kilometerborden (in etappe-modus in "echte" etappe-kilometers)
    this.kmSigns = new Scroller(scene, 2, 500,
      () => this.makeSign(1.3, 0.7),
      (obj, z) => {
        obj.position.set(ROAD_W / 2 + 1.2 + this.terrain.curveAt(z), this.terrain.heightAt(z) - 0.05, z);
        obj.rotation.y = Math.atan(this.terrain.curveSlopeAt(z));
        const label = stage ? `${Math.round(z * (stage.km / stage.length))} KM` : `${(z / 1000).toFixed(1)} KM`;
        this.drawSign(obj, label, '#ffffff', '#111111');
      },
      500
    );

    // Bergborden (bolletjes-stijl)
    this.bergSigns = new Scroller(scene, 2, 1300,
      () => this.makeSign(2.0, 0.8),
      (obj, z) => {
        obj.position.set(-(ROAD_W / 2 + 1.4) + this.terrain.curveAt(z), this.terrain.heightAt(z) - 0.05, z);
        obj.rotation.y = Math.atan(this.terrain.curveSlopeAt(z));
        this.drawSign(obj, pick(BERG_TEXTS), '#ffffff', '#c01818');
      },
      900
    );

    // Finish-boog voor etappes: vast op stage.length, met geblokte banner.
    if (stage) {
      const gz = stage.length;
      const gate = this.makeFinishGate();
      gate.position.set(this.terrain.curveAt(gz), this.terrain.heightAt(gz) - 0.05, gz);
      gate.rotation.y = Math.atan(this.terrain.curveSlopeAt(gz));
      scene.add(gate);
    }

    this.obstacles = new Obstacles(scene, courseRng.fork(102), this.course, terrain);
  }

  makeChunk(width, segsZ, mat, lift, tileU, curved) {
    const geo = new THREE.PlaneGeometry(width, 60, 1, segsZ);
    geo.rotateX(-Math.PI / 2); // éénmalig gebakken: lokaal xz-vlak, +y omhoog
    const pos = geo.attributes.position;
    if (tileU) {
      // Gras: u-as wereld-verankerd op dezelfde 8 m-tile als de v-as.
      const uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setX(i, pos.getX(i) / 8);
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.lift = lift; // weg 2 cm boven gras: geen z-fighting, geen doorzak
    mesh.userData.curved = curved;
    // Originele lokale x bewaren: refillChunk sheart de weg lateraal langs
    // x(z) en mag niet cumulatief op eerdere offsets stapelen.
    mesh.userData.baseX = Float32Array.from({ length: pos.count }, (_, i) => pos.getX(i));
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    return mesh;
  }

  // Alleen bij (her)plaatsing van een chunk — geen hot-loop werk.
  refillChunk(mesh) {
    const g = mesh.geometry;
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uv = g.attributes.uv;
    const lift = mesh.userData.lift;
    const curved = mesh.userData.curved;
    const baseX = mesh.userData.baseX;
    for (let i = 0; i < pos.count; i++) {
      const wz = mesh.position.z + pos.getZ(i);
      const s = this.terrain.slopeAt(wz);
      const inv = 1 / Math.hypot(1, s);
      if (curved) pos.setX(i, baseX[i] + this.terrain.curveAt(wz));
      pos.setY(i, this.terrain.heightAt(wz) + lift);
      // Analytische normaal: naadloos over chunkgrenzen. Laterale shear laat
      // de normaal ongemoeid (∂P/∂u blijft puur x̂), dus curve-term ontbreekt
      // hier bewust.
      nor.setXYZ(i, 0, inv, -s * inv);
      uv.setY(i, wz / 8); // wereld-verankerd: 1 tile = 8 m
    }
    pos.needsUpdate = nor.needsUpdate = uv.needsUpdate = true;
    g.computeBoundingSphere(); // anders cullt three.js verplaatste chunks
  }

  makeSunflowerPatch() {
    const n = 48;
    const g = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x3e7a2e, roughness: 1 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffc400, roughness: 0.8 });
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.03, 0.7, 5), stemMat, n);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), headMat, n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const x = (i % 8) * 0.95 - 3.33 + this.rand(-0.25, 0.25);
      const z = Math.floor(i / 8) * 0.95 - 3.33 + this.rand(-0.25, 0.25);
      const h = this.rand(0.55, 0.95);
      m.compose(new THREE.Vector3(x, h / 2, z), q, new THREE.Vector3(1, h / 0.7, 1));
      stems.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, h + 0.08, z), q, new THREE.Vector3(0.55, 1, 1));
      heads.setMatrixAt(i, m);
    }
    stems.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    g.add(stems, heads);
    return g;
  }

  // Eén toeschouwer: benen, heup, romp, hoofd met haar of pet, en armen die
  // aan de schouder scharnieren zodat ze in update() echt kunnen juichen.
  makePerson() {
    const p = new THREE.Group();
    const shirt = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(this.rand(0, 1), 0.7, 0.55), roughness: 0.8 });
    const pants = new THREE.MeshStandardMaterial({ color: this.pick([0x2b3a55, 0x3a3f47, 0x5b4632, 0x223327, 0x6e7681]), roughness: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: this.pick([0xe0ac69, 0xc68642, 0x8d5524, 0xf1c27d]), roughness: 0.8 });
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 3, 6), pants);
      leg.position.set(s * 0.075, 0.19, 0);
      p.add(leg);
    }
    const hips = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), pants);
    hips.scale.set(1.15, 0.7, 0.9);
    hips.position.y = 0.37;
    p.add(hips);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 3, 8), shirt);
    torso.position.y = 0.6;
    torso.castShadow = true;
    p.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), skin);
    head.position.y = 0.95;
    p.add(head);
    // Haar (halve bol) of supporterspet (halve bol + klepje).
    const isCap = this.rand(0, 1) < 0.4;
    const hairMat = new THREE.MeshStandardMaterial({
      color: isCap
        ? new THREE.Color().setHSL(this.rand(0, 1), 0.75, 0.5)
        : this.pick([0x2f2013, 0x151210, 0x6b4a26, 0xb8b4ac, 0xc7952d]),
      roughness: 0.85,
    });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.1, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
    hair.position.y = 0.97;
    p.add(hair);
    if (isCap) {
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.08), hairMat);
      visor.position.set(0, 0.99, -0.11); // klepje naar de weg (renner nadert uit -z)
      p.add(visor);
    }
    // Armen: pivot bij de schouder, mesh langs +y — rotation.z beweegt ze.
    // Juichers (70%) hebben de armen omhoog en zwaaien in update(); de rest
    // laat ze rustig hangen.
    const cheering = this.rand(0, 1) < 0.7;
    const arms = [];
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(s * 0.16, 0.76, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 3, 6), shirt);
      arm.position.y = 0.13;
      shoulder.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 5), skin);
      hand.position.y = 0.27;
      shoulder.add(hand);
      shoulder.rotation.z = cheering ? -s * this.rand(0.25, 0.7) : -s * this.rand(2.5, 2.9);
      shoulder.userData = { base: shoulder.rotation.z, amp: cheering ? 0.3 : 0.05, o: s > 0 ? 0 : 1.7 };
      p.add(shoulder);
      arms.push(shoulder);
    }
    return { p, arms };
  }

  makeCrowd() {
    const g = new THREE.Group();
    const n = Math.floor(this.rand(4, 8));
    let flareBuilt = false;
    for (let i = 0; i < n; i++) {
      const { p: person, arms } = this.makePerson();
      // Attribuut: tricolore (35%) of kartonnen bord (23%).
      const roll = this.rand(0, 1);
      if (roll < 0.35) {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.9, 5),
          new THREE.MeshStandardMaterial({ color: 0xb8bec8, roughness: 0.6 })
        );
        pole.position.set(0.16, 1.0, 0);
        person.add(pole);
        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(0.44, 0.28),
          new THREE.MeshStandardMaterial({ map: this.flagTex, side: THREE.DoubleSide, roughness: 0.9 })
        );
        flag.position.set(0.4, 1.32, 0);
        flag.rotation.y = Math.PI; // voorkant naar de naderende renner (-z)
        person.add(flag);
      } else if (roll < 0.58) {
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(0.56, 0.28),
          new THREE.MeshStandardMaterial({ map: this.pick(this.signTexes), side: THREE.DoubleSide, roughness: 0.95 })
        );
        sign.position.set(0, 1.3, 0);
        // Tekstzijde naar de naderende renner (-z), zoals de spandoeken —
        // anders lees je de achterkant gespiegeld.
        sign.rotation.y = Math.PI;
        sign.rotation.z = this.rand(-0.15, 0.15);
        person.add(sign);
        const stick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.34, 5),
          new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 })
        );
        stick.position.set(0, 1.08, 0);
        person.add(stick);
      }
      // Hooguit één fakkelman per groep; zichtbaarheid regelt de placeFn.
      if (!flareBuilt && this.rand(0, 1) < 0.25) {
        flareBuilt = true;
        g.userData.flare = this.makeFlare(person);
      }
      person.scale.setScalar(this.rand(0.8, 1.08)); // kinderen en volwassenen
      person.position.set(this.rand(-0.9, 0.9), 0, this.rand(-1.8, 1.8));
      person.rotation.y = this.rand(-0.6, 0.6);
      g.add(person);
      this.wavers.push({ g: person, phase: this.rand(0, Math.PI * 2), arms });
    }
    return g;
  }

  // Rode vuurfakkel in een opgeheven hand: gloeiende tip + drie rook-sprites
  // die in update() cyclisch opstijgen en vervagen.
  makeFlare(person) {
    const fl = new THREE.Group();
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.3, 5),
      new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.8 })
    );
    stick.position.set(0.24, 1.02, 0);
    stick.rotation.z = -0.35;
    fl.add(stick);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xff2a1a, emissive: 0xff3020, emissiveIntensity: 2.4, roughness: 0.4,
    });
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.1, 6), tipMat);
    tip.position.set(0.29, 1.16, 0);
    tip.rotation.z = -0.35;
    fl.add(tip);
    const sprites = [];
    const mats = [];
    const offsets = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, depthWrite: false, opacity: 0 });
      const s = new THREE.Sprite(m);
      s.position.set(0.31, 1.25, 0);
      fl.add(s);
      sprites.push(s);
      mats.push(m);
      offsets.push(i / 4);
    }
    person.add(fl);
    this.flares.push({ node: fl, tipMat, sprites, mats, offsets, seed: this.rand(0, 10) });
    return fl;
  }

  // Dichte publieksrij links+rechts (x ±4.4) over 12 m, als instanced meshes.
  makeHedgeRow() {
    const g = new THREE.Group();
    g.rotation.order = 'YXZ'; // eerst de bocht in draaien, dan de helling volgen
    const n = 16;
    const half = n / 2;
    const bodies = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.16, 0.38, 3, 8),
      new THREE.MeshStandardMaterial({ roughness: 0.8 }),
      n
    );
    const heads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.1, 8, 7),
      new THREE.MeshStandardMaterial({ roughness: 0.8 }),
      n
    );
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const side = i < half ? -1 : 1;
      const x = side * this.rand(4.15, 4.65);
      const z = -6 + ((i % half) + 0.5) * (12 / half) + this.rand(-0.35, 0.35);
      m.makeTranslation(x, 0.47, z);
      bodies.setMatrixAt(i, m);
      bodies.setColorAt(i, col.setHSL(this.rand(0, 1), 0.7, 0.55));
      m.makeTranslation(x, 0.85, z);
      heads.setMatrixAt(i, m);
      heads.setColorAt(i, col.setHex(this.pick([0xe0ac69, 0xc68642, 0x8d5524, 0xf1c27d])));
    }
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    bodies.castShadow = true;
    g.add(bodies, heads);
    // Elke haag heeft 1-2 fakkelmannen; de placeFn zet ze bijna altijd aan.
    g.userData.flares = [];
    const nf = this.rand(0, 1) < 0.4 ? 2 : 1;
    for (let i = 0; i < nf; i++) {
      const fl = this.makeFlare(g);
      fl.position.set(
        (this.rand(0, 1) < 0.5 ? -1 : 1) * this.rand(4.0, 4.5) - 0.29,
        0,
        this.rand(-5.5, 5.5)
      );
      g.userData.flares.push(fl);
    }
    return g;
  }

  // Frans dorpshuisje: gevel-texture op een box, piramidedak, schoorsteen.
  makeHouse() {
    const g = new THREE.Group();
    const [wall, shutter, roofC] = this.pick([
      ['#f2e6cf', '#3f6d44', 0xb0563c],
      ['#e9d5bd', '#4a6f9e', 0x99503a],
      ['#f6efe2', '#8a4a3a', 0x5a6170],
    ]);
    const w = this.rand(3.2, 4.6);
    const d = this.rand(3.6, 5.2);
    const hh = this.rand(2.5, 3.1);
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(w, hh, d),
      new THREE.MeshStandardMaterial({ map: houseTexture(wall, shutter), roughness: 0.95 })
    );
    walls.position.y = hh / 2;
    walls.castShadow = true;
    g.add(walls);
    // Piramidedak: 4-zijdige kegel, 45° gedraaid en naar de voetprint geschaald.
    const roofH = this.rand(1.0, 1.5);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.SQRT1_2, 1, 4),
      new THREE.MeshStandardMaterial({ color: roofC, roughness: 1, flatShading: true })
    );
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(w * 1.12, roofH, d * 1.12);
    roof.position.y = hh + roofH / 2;
    roof.castShadow = true;
    g.add(roof);
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.7, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x9a8a76, roughness: 1 })
    );
    chimney.position.set(w * 0.28, hh + roofH * 0.75, d * 0.2);
    g.add(chimney);
    return g;
  }

  // Camper van fans: bak + cabine + wielen + uitgeklapte streepjesluifel
  // (gebouwd aan de +x-kant; de placeFn draait hem naar de weg).
  makeCamper() {
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23252c, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.7, 4.2), white);
    body.position.y = 1.25;
    body.castShadow = true;
    g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.0, 1.2), white);
    cab.position.set(0, 0.9, 2.6);
    cab.castShadow = true;
    g.add(cab);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.06), dark);
    windshield.position.set(0, 1.05, 3.18);
    windshield.rotation.x = 0.25;
    g.add(windshield);
    // Vrolijke bies over de flank.
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.18, 4.1), new THREE.MeshStandardMaterial({ color: 0xf0813c, roughness: 0.6 }));
    stripe.position.y = 1.05;
    g.add(stripe);
    for (const [x, z] of [[-0.85, -1.4], [0.85, -1.4], [-0.85, 1.9], [0.85, 1.9]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.34, z);
      g.add(wheel);
    }
    // Luifel op palen, naar de wegkant uitgeklapt.
    const awning = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.3),
      new THREE.MeshStandardMaterial({ map: awningTexture(), side: THREE.DoubleSide, roughness: 0.9 })
    );
    awning.rotation.x = -Math.PI / 2 + 0.18;
    awning.rotation.y = Math.PI / 2;
    awning.position.set(1.75, 1.95, 0);
    g.add(awning);
    for (const z of [-0.7, 0.7]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.85, 5), dark);
      pole.position.set(2.4, 0.93, z);
      g.add(pole);
    }
    return g;
  }

  // Pol hoog gras: instanced kegeltjes in gemengde groentinten, geen schaduw.
  makeGrassTuft() {
    const n = 70;
    const geo = new THREE.ConeGeometry(0.035, 0.3, 4);
    geo.translate(0, 0.15, 0);
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 1 }), n);
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      e.set(this.rand(-0.18, 0.18), this.rand(0, Math.PI), this.rand(-0.18, 0.18));
      q.setFromEuler(e);
      v.set(this.rand(-1.4, 1.4), 0, this.rand(-4, 4));
      sc.set(1, this.rand(0.7, 1.6), 1);
      mtx.compose(v, q, sc);
      m.setMatrixAt(i, mtx);
      m.setColorAt(i, col.setHSL(0.26 + this.rand(-0.03, 0.05), 0.55, 0.3 + this.rand(0, 0.15)));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = false;
    m.rotation.order = 'YXZ'; // eerst de bocht in, dan de helling volgen
    return m;
  }

  // Foodtruck: frietkraam met loket, luifelklep, toonbank en een reuzenfriet
  // op het dak (loket aan de +x-kant; de placeFn draait hem naar de weg).
  makeFoodTruck() {
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    const bodyMat = new THREE.MeshStandardMaterial({ color: this.pick([0xf2e3c8, 0xe86a4a, 0xf0c440]), roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23252c, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.0, 3.4), bodyMat);
    body.position.y = 1.35;
    body.castShadow = true;
    g.add(body);
    for (const [x, z] of [[-0.8, -1.1], [0.8, -1.1], [-0.8, 1.1], [0.8, 1.1]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 12), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.3, z);
      g.add(wheel);
    }
    // Loket: donkere opening + opgeklapte streepjesluifel + toonbank.
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 2.0), dark);
    hatch.position.set(1.06, 1.7, 0);
    g.add(hatch);
    const flap = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.9),
      new THREE.MeshStandardMaterial({ map: awningTexture(), side: THREE.DoubleSide, roughness: 0.9 })
    );
    flap.rotation.y = Math.PI / 2;
    flap.rotation.x = -0.9;
    flap.position.set(1.35, 2.35, 0);
    g.add(flap);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 2.1), bodyMat);
    counter.position.set(1.2, 1.28, 0);
    g.add(counter);
    // Reuzenfriet op het dak.
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.26, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0xd81e05, roughness: 0.7 })
    );
    cone.rotation.x = Math.PI;
    cone.position.set(0, 2.65, 0.8);
    g.add(cone);
    const friet = new THREE.MeshStandardMaterial({ color: 0xffd93b, roughness: 0.7 });
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 0.07), friet);
      f.position.set(-0.12 + (i % 3) * 0.12, 2.98, 0.72 + Math.floor(i / 3) * 0.14);
      f.rotation.z = (i - 2) * 0.13;
      g.add(f);
    }
    // FRITES-bord op de flank.
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.5),
      new THREE.MeshStandardMaterial({ map: foodSignTexture(), roughness: 0.8 })
    );
    sign.rotation.y = Math.PI / 2;
    sign.position.set(1.07, 2.6, 0);
    g.add(sign);
    return g;
  }

  // Finish-boog voor etappes: rode pilaren, geblokte ARRIVÉE-banner, vlaggen.
  makeFinishGate() {
    const g = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xd81e05, roughness: 0.6 });
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.6, 0.5), pillarMat);
      p.position.set(s * (ROAD_W / 2 + 0.8), 2.3, 0);
      p.castShadow = true;
      g.add(p);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.4),
        new THREE.MeshStandardMaterial({ map: tricolorTexture(), side: THREE.DoubleSide })
      );
      flag.position.set(s * (ROAD_W / 2 + 0.8) + 0.35, 4.9, 0);
      g.add(flag);
    }
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_W + 2.4, 1.3),
      new THREE.MeshStandardMaterial({ map: bannerTexture('ARRIVÉE', 'arrivee'), roughness: 0.8 })
    );
    banner.rotation.y = Math.PI; // naar de naderende renner gericht
    banner.position.y = 4.0;
    g.add(banner);
    return g;
  }

  makeArch(index) {
    const g = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.7 });
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 0.4), pillarMat);
      p.position.set(s * (ROAD_W / 2 + 0.7), 1.8, 0);
      p.castShadow = true;
      g.add(p);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.32),
        new THREE.MeshStandardMaterial({ map: tricolorTexture(), side: THREE.DoubleSide })
      );
      flag.position.set(s * (ROAD_W / 2 + 0.7) + 0.3, 3.85, 0);
      g.add(flag);
    }
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_W + 2.2, 1.15),
      new THREE.MeshStandardMaterial({ roughness: 0.8 })
    );
    banner.rotation.y = Math.PI; // naar de naderende renner gericht
    banner.position.y = 3.6;
    g.add(banner);
    g.userData = { banner, textIndex: index };
    this.setArchText(g, index);
    return g;
  }

  setArchText(arch, index) {
    const [text, style] = index < 0 ? ['GRAND DÉPART', 'tdf'] : ARCH_TEXTS[((index % ARCH_TEXTS.length) + ARCH_TEXTS.length) % ARCH_TEXTS.length];
    this.applyBanner(arch, text, style);
  }

  applyBanner(arch, text, style) {
    const banner = arch.userData.banner;
    if (banner.material.map) banner.material.map.dispose();
    banner.material.map = bannerTexture(text, style);
    banner.material.needsUpdate = true;
  }

  makeSign(w, h) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6),
      new THREE.MeshStandardMaterial({ color: 0x888c94, roughness: 0.6 })
    );
    pole.position.y = 1.0;
    g.add(pole);
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = Math.round((512 * h) / w);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })
    );
    panel.rotation.y = Math.PI;
    panel.position.y = 2.0 + h / 2 - 0.4;
    g.add(panel);
    g.userData = { canvas: c, tex };
    return g;
  }

  drawSign(sign, text, bg, fg) {
    const { canvas, tex } = sign.userData;
    const g = canvas.getContext('2d');
    g.fillStyle = bg;
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.strokeStyle = fg;
    g.lineWidth = 12;
    g.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    g.fillStyle = fg;
    const size = text.length > 12 ? 54 : 76;
    g.font = `bold ${size}px "Arial Black", Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, canvas.width / 2, canvas.height / 2 + 3);
    tex.needsUpdate = true;
  }

  buildMountains() {
    this.mountains = new THREE.Group();
    // Drie tinten (verre toppen blauwer) tegen het "gestempelde" effect.
    const mats = [0x7d8aa5, 0x8a94ab, 0x6f7d9a].map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true })
    );
    const snow = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 1, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const h = this.rand(60, 140);
      const r = this.rand(34, 75);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mats[i % mats.length]);
      const side = i % 2 === 0 ? -1 : 1;
      // Basis 45 m diep: het terrein golft nu ±36 m (col-octaaf) en mag de
      // onderrand nooit blootleggen.
      cone.position.set(side * this.rand(100, 260), h / 2 - 45, this.rand(-120, 430));
      this.mountains.add(cone);
      if (h > 100) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, h * 0.3, 7), snow);
        cap.position.set(cone.position.x, h - h * 0.15 - 45, cone.position.z);
        this.mountains.add(cap);
      }
    }
    this.scene.add(this.mountains);
  }

  buildClouds() {
    this.clouds = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: this.cloudColor });
    for (let i = 0; i < 8; i++) {
      const cl = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(this.rand(3, 6), 8, 6), mat);
        puff.scale.set(1.6, 0.55, 1);
        puff.position.set(j * this.rand(3, 5) - 4, this.rand(-0.5, 0.5), this.rand(-1, 1));
        cl.add(puff);
      }
      cl.position.set(this.rand(-160, 160), this.rand(45, 80), this.rand(-100, 350));
      cl.userData.drift = this.rand(0.3, 1.0);
      this.clouds.add(cl);
    }
    this.scene.add(this.clouds);
  }

  update(playerZ, dt, time) {
    // Achtergrond schuift mee met de speler, ook lateraal door de bochten;
    // wolken deinen mee met de helft van de terreinhoogte zodat ze op cols
    // niet ineens laag hangen.
    const curve = this.terrain.curveAt(playerZ);
    this.mountains.position.set(curve, 0, playerZ);
    this.clouds.position.set(curve * 0.6, this.terrain.heightAt(playerZ) * 0.5, playerZ);
    for (const cl of this.clouds.children) {
      cl.position.x += cl.userData.drift * dt;
      if (cl.position.x > 170) cl.position.x = -170;
    }
    // Publiek juicht: op-en-neer springen + zwaaiende armen (pivot op schouder).
    for (const w of this.wavers) {
      w.g.position.y = Math.max(0, Math.sin(time * 2.4 + w.phase)) * 0.14;
      if (w.arms) {
        for (const a of w.arms) {
          a.rotation.z = a.userData.base + Math.sin(time * 5.2 + w.phase + a.userData.o) * a.userData.amp;
        }
      }
    }
    // Fakkels: flikkerende tip + rook-sprites die opstijgen, uitdijen en
    // vervagen — een flinke pluim, zoals op een echte col.
    for (const fl of this.flares) {
      if (!fl.node.visible) continue;
      fl.tipMat.emissiveIntensity = 2.2 + Math.sin(time * 27 + fl.seed) * 1.0;
      for (let i = 0; i < fl.sprites.length; i++) {
        const p = (time * 0.32 + fl.offsets[i]) % 1;
        const s = fl.sprites[i];
        s.position.set(0.31 + Math.sin((p * 3 + fl.seed) * 2) * 0.22, 1.25 + p * 2.6, 0);
        const sc = 0.5 + p * 1.9;
        s.scale.set(sc, sc, 1);
        fl.mats[i].opacity = (1 - p * p) * 0.65;
      }
    }
    this.roadChunks.update(playerZ, 80);
    this.grassChunks.update(playerZ, 80);
    this.trees.update(playerZ, 45);
    this.sunflowers.update(playerZ, 60);
    this.spectators.update(playerZ);
    this.hedges.update(playerZ, 20);
    this.grassTufts.update(playerZ, 50);
    this.houses.update(playerZ, 60);
    this.vehicles.update(playerZ, 50);
    // 200 m: dekt het banner-snap-venster (tot 176 m vóór de raster-z), anders
    // despawnt een vooruit-gesnapte zone-boog zichtbaar vlak voor de speler.
    this.arches.update(playerZ, 200);
    this.kmSigns.update(playerZ);
    this.bergSigns.update(playerZ);
    this.obstacles.update(playerZ, time);
  }

  dispose() {
    this.obstacles.dispose();
  }
}
