// Power-ups: zwevende bubbels boven de weg die je al springend pakt.
// Zelfde pooling-aanpak als Obstacles in world.js; de game-loop (game.js)
// doet de pickup-detectie en de effecten.
import * as THREE from 'three';

export const PU_DEFS = {
  mushroom: { weight: 3, icon: '🍄', name: 'TURBO' },
  feather: { weight: 3, icon: '🪶', name: 'VEDERLICHT' },
  star: { weight: 2, icon: '⭐', name: 'SUPERKRACHT' },
  heart: { weight: 2, icon: '❤️', name: 'EXTRA LEVEN' },
};

const IDS = Object.keys(PU_DEFS);
// Midden van de bubbel boven het wegdek. Bewust ruim boven hoofdhoogte van de
// renner (~1.6 m), zodat zichtbaar is dat je moet springen; de zwakste
// fiets/renner-combinatie haalt met een sprong vanaf stilstand ~0.71 m lift,
// genoeg voor de pickup-drempel van 0.65 in game.js.
export const FLOAT_H = 2.3;

function starShape() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.3 : 0.13;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

function heartShape() {
  // Klassieke three.js-hartcurve (getekend op z'n kop; mesh draait hem om).
  const s = new THREE.Shape();
  s.moveTo(0.25, 0.25);
  s.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
  s.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
  s.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
  s.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
  s.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
  s.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);
  return s;
}

export class Powerups {
  constructor(scene, rng, terrain) {
    this.scene = scene;
    this.rng = rng;
    this.terrain = terrain;
    this.active = [];
    this.pool = {};
    this.nextZ = 240;
    this.mats = {
      bubble: new THREE.MeshBasicMaterial({
        color: 0x9fd8ff, transparent: true, opacity: 0.2,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
      // Grondmarkering: ring op het asfalt + zachte lichtkolom omhoog, zodat
      // je van ver ziet dat er iets boven die plek zweeft.
      ring: new THREE.MeshBasicMaterial({
        color: 0xffe680, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }),
      beam: new THREE.MeshBasicMaterial({
        color: 0xfff2b0, transparent: true, opacity: 0.09,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }),
      cap: new THREE.MeshStandardMaterial({ color: 0xe23030, roughness: 0.55 }),
      dot: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
      stem: new THREE.MeshStandardMaterial({ color: 0xf5e9d0, roughness: 0.8 }),
      feather: new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.5 }),
      quill: new THREE.MeshStandardMaterial({ color: 0xd8c290, roughness: 0.7 }),
      star: new THREE.MeshStandardMaterial({ color: 0xffd600, roughness: 0.35, emissive: 0xffaa00, emissiveIntensity: 0.55 }),
      heart: new THREE.MeshStandardMaterial({ color: 0xff3b4e, roughness: 0.4, emissive: 0x881122, emissiveIntensity: 0.5 }),
    };
    // Gedeeld over alle gepoolde items: alleen dispose() hier ruimt ze op,
    // disposeObject(scene) slaat ze over.
    for (const m of Object.values(this.mats)) m.userData.shared = true;
  }

  build(id) {
    const g = new THREE.Group();
    // floaty (item + bubbel) dobbert; ring en lichtkolom blijven op hun plek
    // zodat de grondmarkering niet mee op en neer beweegt.
    const floaty = new THREE.Group();
    g.userData.floaty = floaty;
    const spin = new THREE.Group();
    g.userData.spin = spin;
    if (id === 'mushroom') {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.24, 10), this.mats.stem);
      stem.position.y = -0.12;
      spin.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 9), this.mats.cap);
      cap.scale.set(1, 0.72, 1);
      cap.position.y = 0.05;
      spin.add(cap);
      for (const [dx, dy, dz] of [[0.1, 0.16, 0.1], [-0.13, 0.13, -0.03], [0.02, 0.2, -0.13]]) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 5), this.mats.dot);
        dot.position.set(dx, dy, dz);
        spin.add(dot);
      }
    } else if (id === 'feather') {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), this.mats.feather);
      leaf.scale.set(1.15, 0.36, 0.14);
      spin.add(leaf);
      const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 0.66, 6), this.mats.quill);
      quill.rotation.z = Math.PI / 2;
      spin.add(quill);
      spin.rotation.z = 0.55; // schuin, zoals een dwarrelende veer
    } else if (id === 'star') {
      const geo = new THREE.ExtrudeGeometry(starShape(), { depth: 0.09, bevelEnabled: false });
      geo.center();
      spin.add(new THREE.Mesh(geo, this.mats.star));
    } else if (id === 'heart') {
      const geo = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.1, bevelEnabled: false });
      geo.center();
      const m = new THREE.Mesh(geo, this.mats.heart);
      m.rotation.z = Math.PI; // hartcurve staat op z'n kop
      m.scale.setScalar(0.62);
      spin.add(m);
    }
    spin.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    floaty.add(spin);
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 12), this.mats.bubble);
    bubble.renderOrder = 1;
    floaty.add(bubble);
    g.add(floaty);
    // Ring op het asfalt (groep-origin hangt op FLOAT_H boven de weg).
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.52, 24), this.mats.ring);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -FLOAT_H + 0.04;
    ring.renderOrder = 1;
    g.add(ring);
    // Zachte lichtkolom van de ring omhoog naar de bubbel.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.44, FLOAT_H - 0.55, 14, 1, true),
      this.mats.beam
    );
    beam.position.y = -(FLOAT_H + 0.55) / 2;
    beam.renderOrder = 1;
    g.add(beam);
    return g;
  }

  spawn(z, time) {
    let total = 0;
    for (const id of IDS) total += PU_DEFS[id].weight;
    let roll = this.rng.next() * total;
    let id = IDS[0];
    for (const cand of IDS) {
      roll -= PU_DEFS[cand].weight;
      if (roll <= 0) { id = cand; break; }
    }
    this.pool[id] = this.pool[id] || [];
    const obj = this.pool[id].pop() ?? this.build(id);
    const oy = this.terrain.heightAt(z);
    obj.position.set(this.terrain.curveAt(z), oy + FLOAT_H, z);
    this.scene.add(obj);
    this.active.push({ id, obj, z, oy, t0: time });
  }

  collect(o) {
    const i = this.active.indexOf(o);
    if (i < 0) return;
    this.scene.remove(o.obj);
    this.pool[o.id].push(o.obj);
    this.active.splice(i, 1);
  }

  update(playerZ, time) {
    while (this.nextZ < playerZ + 320) {
      this.spawn(this.nextZ, time);
      this.nextZ += this.rng.range(300, 520);
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      if (o.z < playerZ - 25) {
        this.scene.remove(o.obj);
        this.pool[o.id].push(o.obj);
        this.active.splice(i, 1);
      }
    }
    // Dobberen + draaien; faseverschil per spawn zodat ze niet synchroon
    // dansen. Alleen het item+bubbel dobbert; de grondmarkering staat stil.
    for (const o of this.active) {
      o.obj.userData.floaty.position.y = Math.sin((time - o.t0) * 2.2 + o.z) * 0.15;
      o.obj.userData.spin.rotation.y = time * 1.8 + o.z;
    }
  }

  // Zelfde reden als Obstacles.dispose: gepoolde objecten staan buiten de scene.
  dispose() {
    for (const list of Object.values(this.pool)) {
      for (const obj of list) {
        obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      }
    }
    for (const m of Object.values(this.mats)) m.dispose();
  }
}
