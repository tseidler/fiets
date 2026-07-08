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

// Asfalt mét ingebakken rand- en middenstrepen. Eén tile = 8 m weg (v-as),
// u-as beslaat de volle wegbreedte van 7 m — strepen kunnen dus nooit
// boven de heuvels zweven en er is niets om mee te z-fighten.
function asphaltTexture() {
  const t = canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = '#3d4045';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1100; i++) {
      const shade = 50 + Math.floor(Math.random() * 34);
      g.fillStyle = `rgba(${shade},${shade + 2},${shade + 6},0.55)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.fillStyle = '#e8e8e0';
    const edgeU = ((0.2 / ROAD_W) * w); // randlijn-centrum op 0.2 m van de wegrand
    const edgeW = (0.12 / ROAD_W) * w;
    g.fillRect(edgeU - edgeW / 2, 0, edgeW, h);
    g.fillRect(w - edgeU - edgeW / 2, 0, edgeW, h);
    const dashW = (0.16 / ROAD_W) * w; // middenstreep: 1.4 m van elke 8 m
    g.fillRect(w / 2 - dashW / 2, 0, dashW, (1.4 / 8) * h);
  });
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Subtiel gevlekt gras; blobs worden gewrapt getekend zodat de tile naadloos is.
function grassTexture() {
  const t = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#6aa84f';
    g.fillRect(0, 0, w, h);
    const tints = ['#639e48', '#71b257', '#5e9a44', '#76b75c'];
    g.globalAlpha = 0.3;
    for (let i = 0; i < 260; i++) {
      g.fillStyle = tints[i % tints.length];
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 3 + Math.random() * 9;
      for (const dx of [0, -w, w]) {
        for (const dy of [0, -h, h]) {
          g.beginPath();
          g.arc(x + dx, y + dy, r, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    g.globalAlpha = 1;
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

function paveTexture() {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#5b5e63';
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const shade = 90 + Math.floor(Math.random() * 50);
        g.fillStyle = `rgb(${shade},${shade},${shade + 6})`;
        g.fillRect(x * 32 + 2 + (y % 2 ? 8 : 0), y * 32 + 2, 26, 26);
      }
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
  publiek: { len: [250, 400], minDist: 400, weight: 2, fx: { w: { barrier: 3, cones: 2, pave: 0 }, spacing: 0.9, cluster: 0.25 }, toast: 'PUBLIEKSHAAG !' },
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
    this.mats = {
      hay: new THREE.MeshStandardMaterial({ color: 0xd9b45b, roughness: 1 }),
      hayEnd: new THREE.MeshStandardMaterial({ color: 0xc29a3f, roughness: 1 }),
      log: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
      logEnd: new THREE.MeshStandardMaterial({ color: 0xa8845c, roughness: 0.9 }),
      cone: new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.7 }),
      barrier: new THREE.MeshStandardMaterial({ map: barrierTexture(), roughness: 0.8 }),
      pave: new THREE.MeshStandardMaterial({ map: paveTexture(), roughness: 1 }),
      post: new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 }),
    };
  }

  build(id) {
    const g = new THREE.Group();
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
    obj.position.set(0, oy, z);
    obj.rotation.x = def.pave ? -Math.atan(this.terrain.slopeAt(z)) : 0;
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
    const roadMat = new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.95 });
    const grassMat = new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 });
    const placeChunk = (mesh, z) => {
      mesh.position.z = z + 30;
      this.refillChunk(mesh);
    };
    this.roadChunks = new Scroller(scene, 9, 60, () => this.makeChunk(ROAD_W, 60, roadMat, 0.02, false), placeChunk, -120);
    this.grassChunks = new Scroller(scene, 9, 60, () => this.makeChunk(500, 30, grassMat, 0, true), placeChunk, -120);

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
        obj.position.set(side * rand(6, 26), this.terrain.heightAt(zf) - 0.05, zf);
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
        obj.position.set(side * rand(8, 14), this.terrain.heightAt(z) - 0.05, z);
        obj.rotation.x = -Math.atan(this.terrain.slopeAt(z));
      }
    );

    // Juichend publiek met Franse vlaggen
    this.flagTex = tricolorTexture();
    this.spectators = new Scroller(scene, 8, 95,
      () => this.makeCrowd(),
      (obj, z) => {
        const side = rand(0, 1) < 0.5 ? -1 : 1;
        const zf = z + rand(-8, 8);
        obj.position.set(side * rand(4.3, 5.6), this.terrain.heightAt(zf) - 0.05, zf);
        obj.rotation.x = -Math.atan(this.terrain.slopeAt(zf));
      },
      40
    );

    // Publiekshaag: dichte rijen die alleen zichtbaar zijn in publiekszones.
    this.hedges = new Scroller(scene, 10, 12,
      () => this.makeHedgeRow(),
      (obj, z) => {
        obj.visible = this.course.zoneAt(z).type === 'publiek';
        obj.position.set(0, this.terrain.heightAt(z) - 0.05, z);
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
        obj.position.z = zf;
        obj.position.y = this.terrain.heightAt(zf) - 0.05;
      },
      45
    );
    // Eerste boog is altijd het Grand Départ
    this.setArchText(this.arches.items[0].obj, -1);

    // Kilometerborden
    this.kmSigns = new Scroller(scene, 2, 500,
      () => this.makeSign(1.3, 0.7),
      (obj, z) => {
        obj.position.set(ROAD_W / 2 + 1.2, this.terrain.heightAt(z) - 0.05, z);
        this.drawSign(obj, `${(z / 1000).toFixed(1)} KM`, '#ffffff', '#111111');
      },
      500
    );

    // Bergborden (bolletjes-stijl)
    this.bergSigns = new Scroller(scene, 2, 1300,
      () => this.makeSign(2.0, 0.8),
      (obj, z) => {
        obj.position.set(-(ROAD_W / 2 + 1.4), this.terrain.heightAt(z) - 0.05, z);
        this.drawSign(obj, pick(BERG_TEXTS), '#ffffff', '#c01818');
      },
      900
    );

    this.obstacles = new Obstacles(scene, courseRng.fork(102), this.course, terrain);
  }

  makeChunk(width, segsZ, mat, lift, tileU) {
    const geo = new THREE.PlaneGeometry(width, 60, 1, segsZ);
    geo.rotateX(-Math.PI / 2); // éénmalig gebakken: lokaal xz-vlak, +y omhoog
    if (tileU) {
      // Gras: u-as wereld-verankerd op dezelfde 8 m-tile als de v-as.
      const pos = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setX(i, pos.getX(i) / 8);
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.lift = lift; // weg 2 cm boven gras: geen z-fighting, geen doorzak
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
    for (let i = 0; i < pos.count; i++) {
      const wz = mesh.position.z + pos.getZ(i);
      const s = this.terrain.slopeAt(wz);
      const inv = 1 / Math.hypot(1, s);
      pos.setY(i, this.terrain.heightAt(wz) + lift);
      nor.setXYZ(i, 0, inv, -s * inv); // analytische normaal: naadloos over chunkgrenzen
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
    const n = Math.floor(this.rand(4, 8));
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
    const mat = new THREE.MeshStandardMaterial({ color: 0x7d8aa5, roughness: 1, flatShading: true });
    const snow = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 1, flatShading: true });
    for (let i = 0; i < 14; i++) {
      const h = this.rand(30, 85);
      const r = this.rand(28, 60);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat);
      const side = i % 2 === 0 ? -1 : 1;
      // Basis 10 m diep: h(z) ∈ [-8.7, 8.7] legt nooit de onderrand bloot.
      cone.position.set(side * this.rand(90, 240), h / 2 - 10, this.rand(-120, 420));
      this.mountains.add(cone);
      if (h > 55) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, h * 0.3, 7), snow);
        cap.position.set(cone.position.x, h - h * 0.15 - 10, cone.position.z);
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
    this.mountains.position.z = playerZ;
    this.clouds.position.z = playerZ;
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
