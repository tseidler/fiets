// Externe decor-modellen (GLB-huizen uit assets/environment, geconverteerd —
// zie public/models/env/report.md). Statisch decor: normaliseren op bounding
// box is genoeg (voetprint gecentreerd, onderkant op y=0, geschaald naar een
// richthoogte). Clones delen geometrie/materialen met de template en zijn
// daarom userData.shared (disposeObject slaat ze over).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// height = richthoogte in meters. Bewust conservatief voor de modellen met
// een grote voetafdruk (cottage 12×15, cyprys 12×16, bambo 14×15 in het
// origineel): de berm-plaatsing begint op 9.5 m van de wegas, dus de halve
// diagonaal van de voetafdruk moet daar ruim onder blijven (report.md).
const HOUSES = [
  { url: 'models/env/cottage.glb', height: 3.8 },
  { url: 'models/env/building04.glb', height: 6.2 },
  { url: 'models/env/cyprys.glb', height: 4.4 },
  { url: 'models/env/bambo.glb', height: 4.6 },
];

// Bomen (TreeSet.blend → 3 gedecimeerde varianten, elk ~7k verts met
// alpha-cutout bladeren). height = richthoogte; de bomen-Scroller schaalt
// daar nog eens 0.8-1.6× overheen.
const TREES = [
  // treeset1 was in de bron een hérfstboom; hij heeft nu een geel-groene
  // bladtexture in de GLB en krijgt een milde groene multiply-tint zodat hij
  // qua kleur bij de twee andere bomen past.
  { url: 'models/env/trees/treeset1.glb', height: 3.8, leafTint: 0x9fe08c },
  { url: 'models/env/trees/treeset2.glb', height: 4.5 }, // den
  { url: 'models/env/trees/treeset3.glb', height: 4.0 }, // loofboom
];

const templates = [];
const treeTemplates = [];

function makeTemplate(scene, cfg) {
  const root = new THREE.Group();
  root.add(scene);
  const box = new THREE.Box3().setFromObject(scene);
  const h = box.max.y - box.min.y;
  if (!(h > 0)) return null;
  const s = cfg.height / h;
  root.scale.setScalar(s);
  // Voetprint-centrum op (0, ·, 0), onderkant op y=0.
  root.position.set(
    -s * (box.min.x + box.max.x) / 2,
    -s * box.min.y,
    -s * (box.min.z + box.max.z) / 2
  );
  // Wrapper zodat clones op (0,0,0) staan en de offset intern blijft.
  const wrap = new THREE.Group();
  wrap.add(root);
  wrap.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.userData.shared = true;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (cfg.leafTint && /leaves/i.test(m.name)) m.color.set(cfg.leafTint);
        m.userData.shared = true;
        if (m.map) m.map.userData.shared = true;
      }
    }
  });
  return wrap;
}

// Laadt alle huizen en bomen; wat faalt valt stil terug op procedureel decor.
export async function preloadEnvModels() {
  const loader = new GLTFLoader();
  const base = import.meta.env.BASE_URL;
  const load = async (cfg, list) => {
    try {
      const gltf = await loader.loadAsync(base + cfg.url);
      const t = makeTemplate(gltf.scene, cfg);
      if (t) list.push(t);
    } catch (e) {
      console.warn(`Decor-model '${cfg.url}' niet geladen (${e.message})`);
    }
  };
  await Promise.all([
    ...HOUSES.map((cfg) => load(cfg, templates)),
    ...TREES.map((cfg) => load(cfg, treeTemplates)),
  ]);
  return templates.length > 0 || treeTemplates.length > 0;
}

// Clone van huis-model i (round-robin); null als er (nog) geen modellen zijn.
export function cloneHouseModel(i) {
  if (!templates.length) return null;
  return templates[i % templates.length].clone(true);
}

// Clone van boom-model i (round-robin); null als er (nog) geen modellen zijn.
export function cloneTreeModel(i) {
  if (!treeTemplates.length) return null;
  return treeTemplates[i % treeTemplates.length].clone(true);
}
