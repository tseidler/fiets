// Gedeelde environment-map (IBL) voor glans op carbon, metaal en helmen.
// Eén PMREM-render per sessie, gecachet — zowel de showroom als de race
// gebruiken dezelfde texture, dus nooit disposen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let tex = null;

export function envMap(renderer) {
  if (!tex) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  return tex;
}
