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
    } else if (style === 'polka') {
      g.fillStyle = '#ffffff';
    } else if (style === 'sprint') {
      g.fillStyle = '#27b04b';
    } else {
      g.fillStyle = '#ffd600';
    }
    g.fillRect(0, 0, w, h);
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
  kasseien: { len: [180, 280], minDist: 800, weight: 2, fx: { w: { pave: 8, hay: 0.3, log: 0, barrier: 0 }, spacing: 0.3, cluster: 0 }, toast: 'SECTEUR PAVÉ !', banner: ['SECTEUR PAVÉ', 'polka'] },
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
    }
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }

  spawn(z, dist, fx) {
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
    this.active.push({ id, obj, z, h: def.h, d: def.d, pave: !!def.pave, counted: false, oy });
    return def;
  }

  update(playerZ) {
    while (this.nextZ < playerZ + 320) {
      const zone = this.course.zoneAt(this.nextZ);
      const def = this.spawn(this.nextZ, playerZ, zone.fx);
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
      if (m.map) m.map.dispose();
      if (m.bumpMap) m.bumpMap.dispose();
      m.dispose();
    }
  }
}

export class World {
  constructor(scene, rng, ambiance, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.wavers = [];

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

    // Bomen langs de route
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x2d6a34, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f9a3f, roughness: 1 });
    this.trees = new Scroller(scene, 28, 22,
      () => {
        const t = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 7), trunkMat);
        trunk.position.y = 0.6;
        trunk.castShadow = true;
        t.add(trunk);
        if (rand(0, 1) < 0.5) {
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
        obj.visible = climb || rand(0, 1) < 0.55;
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
    this.hedges = new Scroller(scene, 12, 12,
      () => this.makeHedgeRow(),
      (obj, z) => {
        obj.visible = this.course.zoneAt(z).type === 'publiek';
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

    // Kilometerborden
    this.kmSigns = new Scroller(scene, 2, 500,
      () => this.makeSign(1.3, 0.7),
      (obj, z) => {
        obj.position.set(ROAD_W / 2 + 1.2 + this.terrain.curveAt(z), this.terrain.heightAt(z) - 0.05, z);
        obj.rotation.y = Math.atan(this.terrain.curveSlopeAt(z));
        this.drawSign(obj, `${(z / 1000).toFixed(1)} KM`, '#ffffff', '#111111');
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

  makeCrowd() {
    const g = new THREE.Group();
    const n = Math.floor(this.rand(5, 10));
    for (let i = 0; i < n; i++) {
      const person = new THREE.Group();
      const color = new THREE.Color().setHSL(this.rand(0, 1), 0.7, 0.55);
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      const skinMat = new THREE.MeshStandardMaterial({ color: this.pick([0xe0ac69, 0xc68642, 0x8d5524, 0xf1c27d]), roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.38, 3, 8), bodyMat);
      body.position.y = 0.47;
      body.castShadow = true;
      person.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 7), skinMat);
      head.position.y = 0.85;
      person.add(head);
      if (this.rand(0, 1) < 0.45) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 5), bodyMat);
        pole.position.set(0.16, 0.95, 0);
        person.add(pole);
        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(0.44, 0.28),
          new THREE.MeshStandardMaterial({ map: this.flagTex, side: THREE.DoubleSide, roughness: 0.9 })
        );
        flag.position.set(0.4, 1.25, 0);
        person.add(flag);
      }
      person.position.set(this.rand(-0.9, 0.9), 0, this.rand(-1.8, 1.8));
      person.rotation.y = this.rand(-0.6, 0.6);
      g.add(person);
      this.wavers.push({ g: person, phase: this.rand(0, Math.PI * 2) });
    }
    return g;
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
    for (const w of this.wavers) {
      w.g.position.y = Math.max(0, Math.sin(time * 2.4 + w.phase)) * 0.14;
    }
    this.roadChunks.update(playerZ, 80);
    this.grassChunks.update(playerZ, 80);
    this.trees.update(playerZ, 45);
    this.sunflowers.update(playerZ, 60);
    this.spectators.update(playerZ);
    this.hedges.update(playerZ, 20);
    // 200 m: dekt het banner-snap-venster (tot 176 m vóór de raster-z), anders
    // despawnt een vooruit-gesnapte zone-boog zichtbaar vlak voor de speler.
    this.arches.update(playerZ, 200);
    this.kmSigns.update(playerZ);
    this.bergSigns.update(playerZ);
    this.obstacles.update(playerZ);
  }

  dispose() {
    this.obstacles.dispose();
  }
}
