// Externe fietsmodellen (GLB, geconverteerd vanuit assets/ — zie
// public/models/report.md). Elk model wordt éénmalig geladen en genormaliseerd
// naar de rig-conventies van models.js: rijrichting +z, y-up, grond op y=0,
// wielstraal WHEEL_R. Bewegende onderdelen (wielen, cranks, pedalen) hangen in
// wereld-gerichte pivot-groups zodat animate() ze — net als bij de procedurele
// fiets — simpelweg om de x-as draait, ongeacht de node-oriëntaties in de GLB.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const WHEEL_R = 0.34; // moet gelijk zijn aan models.js

// Per type: node-namen uit de GLB + rot: Euler die het model naar
// +z-rijrichting/y-up draait. Waarden volgen uit public/models/report.md:
// beide modellen rijden in Blender naar +Y → in glTF (y-up) is dat −z,
// dus 180° om y. front/back: eerste naam = band (meet-anker voor straal en
// as-centrum), de rest draait mee in dezelfde wiel-pivot (velg, naaf, ventiel).
const CONFIG = {
  mtb: {
    url: 'models/mtb.glb',
    front: ['ban_depan_Torus'],
    back: ['ban_belakang_Torus.001'],
    gear: 'gear_depan_gear_depan_gear_depan.001_Circle.013',
    pedals: ['pedal_kanan_Cube.000', 'pedal_kiri_Cube.007'],
    frameMats: ['uv_rangka', 'col_rangka'],
    // Custom OBJ→GLB-writer (zie report.md): up ligt op −z, rijrichting op −y.
    // Numeriek geverifieerd: YXZ-euler (π/2, π, 0) → forward +z, up +y.
    rot: [Math.PI / 2, Math.PI, 0],
    rotOrder: 'YXZ',
  },
  race: {
    url: 'models/race.glb',
    front: ['Cylinder.075', 'Circle.004', 'Circle.006', 'Cylinder.082', 'Cylinder.083', 'Cylinder.084', 'Cube.017', 'Cylinder.087'],
    back: ['Cylinder.023', 'Circle', 'Circle.002', 'Cylinder.037', 'Cylinder.038', 'Cylinder.042', 'Cylinder.046', 'Cube.018', 'Cube.009'],
    gear: null, // geen aparte crank/pedaal-objecten in dit model
    pedals: [],
    frameMats: ['Material'],
    // Alles behalve het frame zwart: banden, crankstel, derailleur, cassette,
    // stuurpen, schakelwerk, zadelpen en zadel (alle niet-frame-materialen).
    blackExcept: ['Material'],
    rot: [0, Math.PI, 0],
    // Kapot object: curve-modifier verwees naar verwijderd pad (zie report.md)
    strip: ['Circle.003'],
  },
};

const templates = {}; // type → { root, anchors }

function worldCenter(obj) {
  return new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
}

// Wereld-gerichte pivot op worldPos, als kind van parent (parent-keten mag
// alleen uniforme schaal + translatie hebben, geen rotatie — dan blijven de
// lokale assen van de pivot wereld-gericht en is rotation.x een zuivere
// draai om de game-x-as). node wordt ge-attach'd met behoud van transform.
function gamePivot(parent, worldPos, name, nodes) {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.copy(parent.worldToLocal(worldPos.clone()));
  parent.add(pivot);
  pivot.updateMatrixWorld(true);
  for (const n of nodes) pivot.attach(n);
  return pivot;
}

// GLTFLoader saneert node-namen (punten e.d. worden gestript): zoek eerst
// exact, dan met de gestripte variant.
function byName(scene, n) {
  return scene.getObjectByName(n) || scene.getObjectByName(n.replace(/[\s.[\]:/]/g, ''));
}

// Normaliseer een geladen scene naar game-ruimte en bouw de pivots.
function makeTemplate(scene, cfg) {
  const root = new THREE.Group(); // krijgt schaal+positie, bewust GEEN rotatie
  const model = new THREE.Group(); // de oriëntatie-correctie zit één laag lager
  model.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2], cfg.rotOrder || 'XYZ');
  model.add(scene);
  root.add(model);
  root.updateMatrixWorld(true);

  // Kapotte/overbodige nodes verwijderen vóór het meten.
  for (const n of cfg.strip || []) {
    const o = byName(scene, n);
    if (o) o.parent.remove(o);
  }

  const fronts = cfg.front.map((n) => byName(scene, n)).filter(Boolean);
  const backs = cfg.back.map((n) => byName(scene, n)).filter(Boolean);
  const front = fronts[0];
  const back = backs[0];
  if (!front || !back) return null; // zonder wielen geen schaal-anker

  // Schaal: wielstraal → WHEEL_R (hoogte-extent van het voorwiel in wereld-y).
  const fBox = new THREE.Box3().setFromObject(front);
  const rModel = (fBox.max.y - fBox.min.y) / 2;
  if (!(rModel > 0)) return null;
  root.scale.setScalar(WHEEL_R / rModel);
  root.updateMatrixWorld(true);

  // Positioneer: assen op y=WHEEL_R (wielen raken de grond), midden tussen de
  // assen op z=0, gecentreerd op x=0. cfg.rot moet het voorwiel op +z leggen.
  const fc = worldCenter(front);
  const bc = worldCenter(back);
  root.position.set(
    -(fc.x + bc.x) / 2,
    WHEEL_R - (fc.y + bc.y) / 2,
    -(fc.z + bc.z) / 2
  );
  root.updateMatrixWorld(true);

  // Pivots voor de animatie (zelfde API als de procedurele fiets):
  // wielen draaien om x, crank om x, pedalen contra-roteren om x.
  gamePivot(root, worldCenter(front), 'pivotWheelF', fronts);
  gamePivot(root, worldCenter(back), 'pivotWheelB', backs);

  const anchors = {};
  const gear = cfg.gear ? byName(scene, cfg.gear) : null;
  const pedalNodes = (cfg.pedals || []).map((n) => byName(scene, n)).filter(Boolean);
  if (gear && pedalNodes.length === 2) {
    const bb = worldCenter(gear);
    const pc = worldCenter(pedalNodes[0]);
    const crank = gamePivot(root, bb, 'crankPivot', [gear]);
    pedalNodes.forEach((p, i) => gamePivot(crank, worldCenter(p), `pedalPivot${i}`, [p]));
    // IK-ankers voor de benen: trapas + cranklengte in het yz-vlak.
    anchors.bbY = bb.y;
    anchors.bbZ = bb.z;
    anchors.pedR = Math.hypot(pc.y - bb.y, pc.z - bb.z);
  }

  // Gedeeld over alle clones: geometrie en (ongetinte) materialen nooit
  // disposen met een rig mee (zie disposeObject in models.js).
  // blackExcept: alle materialen buiten die lijst worden carbon-zwart
  // (éénmalig op de template; alle clones delen deze materialen).
  const keep = cfg.blackExcept ? new Set(cfg.blackExcept) : null;
  root.traverse((o) => {
    if (o.isMesh) {
      o.userData.shared = true;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (keep && !keep.has(m.name)) m.color.set(0x121317);
        m.userData.shared = true;
        if (m.map) m.map.userData.shared = true;
      }
    }
  });
  return { root, anchors };
}

// Laadt beide modellen; faalt stil per model (fallback = procedurele fiets).
// Resolvet true zodra er minstens één model beschikbaar is.
export async function preloadBikeModels() {
  const loader = new GLTFLoader();
  const base = import.meta.env.BASE_URL;
  const jobs = Object.entries(CONFIG).map(async ([type, cfg]) => {
    try {
      const gltf = await loader.loadAsync(base + cfg.url);
      const t = makeTemplate(gltf.scene, cfg);
      if (t) templates[type] = t;
      else console.warn(`Fietsmodel '${type}': wielen niet gevonden, procedurele fallback`);
    } catch (e) {
      console.warn(`Fietsmodel '${type}' niet geladen (${e.message}), procedurele fallback`);
    }
  });
  await Promise.all(jobs);
  return Object.keys(templates).length > 0;
}

// Clone voor één fietsvariant, met frame-tint in de kleur van de variant.
// Retourneert null als er geen model voor dit type is (→ procedurele fiets).
export function buildModelBike(def) {
  const t = templates[def.type];
  if (!t) return null;
  const g = t.root.clone(true);
  const cfg = CONFIG[def.type];

  // Frame-tint: eigen materiaal-instantie per rig (kleur verschilt per
  // variant), niet shared zodat hij netjes met de rig mee-disposet.
  const tintNames = new Set(cfg.frameMats || []);
  g.traverse((o) => {
    if (o.isMesh && !Array.isArray(o.material) && tintNames.has(o.material.name)) {
      const m = o.material.clone();
      m.userData = { ...m.userData };
      delete m.userData.shared;
      // Vlakke variant-kleur: de gebakken frame-texture zou de tint
      // vertroebelen (kleur × texture), dus die gaat eraf.
      m.map = null;
      m.color.set(def.color);
      o.material = m;
    }
  });

  const find = (n) => g.getObjectByName(n) || null;
  const pedals = [find('pedalPivot0'), find('pedalPivot1')].filter(Boolean);
  g.userData = {
    wheelF: find('pivotWheelF'),
    wheelB: find('pivotWheelB'),
    crank: find('crankPivot') || new THREE.Group(),
    pedals: pedals.length === 2 ? pedals : [new THREE.Group(), new THREE.Group()],
    anchors: t.anchors.pedR ? t.anchors : null,
  };
  return g;
}
