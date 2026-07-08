// Showroom: draaiend 3D-voorbeeld van renner + fiets in de keuzemenu's.
import * as THREE from 'three';
import { disposeObject } from './models.js';
import { envMap } from './env.js';

export class Showroom {
  constructor(renderer) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x12151f);
    // IBL laat het carbon en metaal in de showroom glanzen.
    this.scene.environment = envMap(renderer);
    this.scene.environmentIntensity = 0.5;
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(2.7, 1.8, 3.6);
    this.camera.lookAt(0, 0.85, 0);

    this.scene.add(new THREE.HemisphereLight(0xdde6ff, 0x202430, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);
    const rim = new THREE.PointLight(0xffd600, 30, 20);
    rim.position.set(-3, 2.5, -3);
    this.scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 40),
      new THREE.MeshStandardMaterial({ color: 0x1a1e2a, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.7, 0.16, 36),
      new THREE.MeshStandardMaterial({ color: 0xffd600, roughness: 0.35, metalness: 0.4 })
    );
    podium.position.y = 0.08;
    podium.receiveShadow = true;
    this.scene.add(podium);

    this.slot = new THREE.Group();
    this.slot.position.y = 0.16;
    this.scene.add(this.slot);
  }

  show(model) {
    for (const child of [...this.slot.children]) {
      this.slot.remove(child);
      disposeObject(child);
    }
    if (model) this.slot.add(model);
  }

  update(dt) {
    this.slot.rotation.y += dt * 0.8;
  }

  render(renderer) {
    renderer.render(this.scene, this.camera);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
