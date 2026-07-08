// De race zelf: trappen met R/U (of J vasthouden), springen met spatie,
// obstakels ontwijken.
import * as THREE from 'three';
import { World, ZONES, AMBIANCES } from './world.js';
import { Terrain } from './terrain.js';
import { RNG } from './rng.js';
import { buildRig, disposeObject } from './models.js';
import { envMap } from './env.js';
import { sfx } from './audio.js';

const GRAVITY = 22;
const SLOPE_ACCEL = 9.0; // helling↔snelheid-koppeling (apart houden voor playtests)
// Auto-trappen (J vasthouden): één pedaalslag per interval. Bewust langzamer
// dan snel handmatig afwisselen (~14 m/s evenwicht vs 17+ top) zodat R/U
// blijven lonen voor wie het tempo zelf wil maken.
const AUTO_PEDAL_INTERVAL = 0.28;
const MILESTONE_PHRASES = ['Allez allez!', 'Chapeau!', 'Formidable!', 'Het peloton is gelost!', 'Vive le vélo!', 'Tête de la course!'];

const el = (id) => document.getElementById(id);

function pickWeighted(list, rng) {
  let total = 0;
  for (const it of list) total += it.weight;
  let roll = rng.next() * total;
  for (const it of list) {
    roll -= it.weight;
    if (roll <= 0) return it;
  }
  return list[list.length - 1];
}

export class Race {
  constructor(renderer, char, bike, cb) {
    this.renderer = renderer;
    this.char = char;
    this.bike = bike;
    this.cb = cb;

    this.top = bike.top * char.mods.top;
    this.power = bike.power * char.mods.power;
    this.jumpMod = Math.min(1.45, bike.jump * char.mods.jump);

    this.scene = new THREE.Scene();
    // Subtiele IBL: laat carbon frames, metaal en helmen glanzen zonder de
    // per-ambiance belichting te overstemmen.
    this.scene.environment = envMap(renderer);
    this.scene.environmentIntensity = 0.28;
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

    // Seed + gescheiden RNG-streams: 0=ambiance, 1=decor, 2=course, 3=terrein.
    // runCounter-xor voorkomt identieke seeds bij snelle herstart; ?seed= geeft
    // een reproduceerbaar parcours.
    const params = new URLSearchParams(location.search);
    const q = Number(params.get('seed'));
    this.seed = (q || (Date.now() ^ ((Race.runCounter = (Race.runCounter | 0) + 1) * 0x9E3779B9))) >>> 0;
    // Debug: ?start=3000 begint de rit verderop in het parcours.
    this.startZ = Math.max(0, Number(params.get('start')) || 0);
    const rng = new RNG(this.seed);
    this.ambiance = pickWeighted(AMBIANCES, rng.fork(0));
    this.terrain = new Terrain(rng.fork(3));

    const amb = this.ambiance;
    const hemi = new THREE.HemisphereLight(amb.hemiSky, amb.hemiGnd, amb.hemiI);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(amb.sun, amb.sunI);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    // Lage zon (ochtend/avond) geeft lange schaduwen: breder frustum tegen pop.
    // Iets ruimer dan strikt nodig omdat de weg nu lateraal wegbocht.
    const wide = amb.sunPos[1] < 30;
    this.sun.shadow.camera.left = wide ? -50 : -38;
    this.sun.shadow.camera.right = wide ? 50 : 38;
    this.sun.shadow.camera.top = wide ? 50 : 40;
    this.sun.shadow.camera.bottom = wide ? -50 : -40;
    this.sun.shadow.camera.far = 150;
    this.scene.add(this.sun, this.sun.target);
    this.sunOff = amb.sunPos;

    this.world = new World(this.scene, rng, this.ambiance, this.terrain);
    this.rig = buildRig(char, bike);
    // Voertuig-conventie: eerst yaw (bocht), dan pitch (helling), dan roll
    // (leunen in de bocht) — elk in het frame van de vorige.
    this.rig.rotation.order = 'YXZ';
    this.scene.add(this.rig);

    // Toestand
    this.phase = 'countdown';
    this.countdownT = 3.999;
    this.frozen = false;
    this.paused = false;
    this.time = 0;
    this.z = this.startZ;
    this.y = this.terrain.heightAt(this.z);
    this.vy = 0;
    this.grounded = true;
    this.speed = 0;
    this.maxSpeed = 0;
    this.hearts = 3;
    this.jumpsCleared = 0;
    this.lastKey = null;
    this.jHeld = false;
    this.autoPedalT = 0;
    this.pedalPhase = 0;
    this.pedalTarget = 0;
    this.crashed = false;
    this.crashT = 0;
    this.invuln = 0;
    this.onPave = false;
    this.shake = 0;
    this.nextMilestone = (Math.floor(this.z / 1000) + 1) * 1000;
    this.nextColCheck = this.z + 250; // eerstvolgende z waarop we op een col checken
    this.curZone = null;
    // Camerastandpunt (V): 0 = veraf, 1 = dichtbij recht achter, 2 = zijkant.
    this.camMode = Math.min(2, Number(localStorage.getItem('fiets.cam') || 0));
    this.best = Number(localStorage.getItem('fiets.best') || 0);

    this.camPos = new THREE.Vector3(
      2.4 + this.terrain.curveAt(this.z - 7.5),
      3.1 + this.terrain.heightAt(this.z - 7.5),
      this.z - 7.5
    );
    // Gehoiste vectors: geen per-frame allocaties in de hot loop.
    this._camTarget = new THREE.Vector3();
    this._look = new THREE.Vector3();

    this.hud = {
      root: el('hud'), speed: el('speed-num'), dist: el('hud-dist'),
      hearts: el('hud-hearts'), best: el('hud-best'),
      keyE: el('key-e'), keyR: el('key-r'),
      countdown: el('countdown'), toast: el('toast'), flash: el('flash'),
    };
    this.hud.root.classList.remove('hidden');
    this.hud.best.textContent = this.best > 0 ? `Record: ${(this.best / 1000).toFixed(2)} km` : '';
    this.updateHearts();
    this.setExpectedKey('r');

    this._onKey = (e) => this.onKey(e);
    window.addEventListener('keydown', this._onKey);
    // J-vasthouden bijhouden; blur als vangnet (keyup mist bij tab-wissel).
    this._onKeyUp = (e) => { if (e.code === 'KeyJ') this.jHeld = false; };
    this._onBlur = () => { this.jHeld = false; };
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  onKey(e) {
    if (this.frozen) return;
    if (e.code === 'Space') e.preventDefault();
    if (e.repeat) return;

    if (e.code === 'Escape') { this.cb.onQuit(); return; }
    if (e.code === 'KeyP') { this.paused = !this.paused; this.toast(this.paused ? 'PAUZE' : 'Verder!', 900); return; }
    if (e.code === 'KeyV') {
      this.camMode = (this.camMode + 1) % 3;
      localStorage.setItem('fiets.cam', String(this.camMode));
      this.toast(['Camera: VERAF', 'Camera: DICHTBIJ', 'Camera: ZIJKANT'][this.camMode], 900);
      return;
    }
    // J vasthouden = blijven trappen; mag óók tijdens countdown/pauze alvast
    // ingedrukt worden — de update-loop bewaakt wanneer er echt kracht komt.
    if (e.code === 'KeyJ') { this.jHeld = true; return; }
    if (this.phase !== 'riding' || this.crashed || this.paused) return;

    if (e.code === 'KeyR' || e.code === 'KeyU') {
      const key = e.code === 'KeyR' ? 'r' : 'u';
      if (key !== this.lastKey) {
        this.pedalStroke(key);
      } else {
        // Zelfde toets twee keer: bijna geen kracht
        this.speed += this.power * 0.1 * Math.max(0.15, 1 - this.speed / this.top);
        sfx.badPedal();
      }
    } else if (e.code === 'Space' && this.grounded) {
      this.grounded = false;
      // Bergop werkt als schans; bergaf geen aftrek (obstakels blijven haalbaar).
      const s = this.terrain.slopeAt(this.z);
      this.vy = (6.6 + Math.min(this.speed, 16) * 0.07) * this.jumpMod + Math.max(0, s) * this.speed;
      sfx.jump();
    }
  }

  // Volle pedaalslag: handmatig (met de gedrukte toets) of automatisch via J
  // (dan alterneert hij zelf verder op lastKey).
  pedalStroke(key = this.lastKey === 'r' ? 'u' : 'r') {
    this.speed = Math.min(this.top, this.speed + this.power * Math.max(0.15, 1 - this.speed / this.top));
    this.pedalTarget += Math.PI;
    sfx.pedal(key === 'r');
    this.lastKey = key;
    this.setExpectedKey(key === 'r' ? 'u' : 'r');
  }

  setExpectedKey(next) {
    this.hud.keyE.classList.toggle('next', next === 'r');
    this.hud.keyR.classList.toggle('next', next === 'u');
  }

  updateHearts() {
    this.hud.hearts.textContent = '❤'.repeat(this.hearts) + '♡'.repeat(3 - this.hearts);
  }

  toast(text, ms = 1800) {
    const t = this.hud.toast;
    t.textContent = text;
    t.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
  }

  crash() {
    this.crashed = true;
    this.crashT = 0;
    this.hearts -= 1;
    this.updateHearts();
    this.slide = this.speed * 0.35;
    this.speed = 0;
    this.shake = 1;
    sfx.crash();
    this.hud.flash.classList.add('on');
    setTimeout(() => this.hud.flash.classList.remove('on'), 350);
    this.toast(this.hearts > 0 ? 'CHUTE !' : 'CHUTE FINALE !', 1500);
  }

  update(dt) {
    if (this.frozen || this.paused) return;
    this.time += dt;

    if (this.phase === 'countdown') {
      this.countdownT -= dt;
      const c = this.hud.countdown;
      c.classList.remove('hidden');
      if (this.countdownT > 1) {
        const n = Math.ceil(this.countdownT - 1);
        if (c.textContent !== String(n)) { c.textContent = String(n); sfx.count(false); }
      } else if (this.countdownT > 0) {
        if (c.textContent !== 'ALLEZ !') { c.textContent = 'ALLEZ !'; sfx.count(true); }
      } else {
        c.classList.add('hidden');
        this.phase = 'riding';
      }
    }

    if (this.phase === 'riding' && !this.crashed) {
      // Auto-trappen: J vasthouden geeft pedaalslagen op vaste cadans.
      if (this.jHeld) {
        this.autoPedalT -= dt;
        if (this.autoPedalT <= 0) {
          this.pedalStroke();
          this.autoPedalT = AUTO_PEDAL_INTERVAL;
        }
      } else {
        this.autoPedalT = 0; // eerstvolgende J-druk trapt direct
      }
      // Zone-check: toast bij binnenrijden van een speciale zone
      const zn = this.world.course.zoneAt(this.z);
      if (zn !== this.curZone) {
        this.curZone = zn;
        const zd = ZONES[zn.type];
        if (zd.toast) {
          this.toast(zd.toast);
          sfx.fanfare();
        }
      }
      // Helling↔snelheid: bergop remt, bergaf versnelt (gecapt op 1.25× top)
      const slope = this.terrain.slopeAt(this.z);
      if (this.grounded) {
        this.speed -= SLOPE_ACCEL * slope * dt;
        if (slope < 0) this.speed = Math.min(this.speed, this.top * 1.25);
      }
      // Uitrollen + luchtweerstand (sprintzone: merkbaar minder rolweerstand)
      this.speed = Math.max(0, this.speed - (0.35 + 0.05 * this.speed) * (zn.fx.drag || 1) * dt);
      // Kasseien remmen af (racefiets veel meer dan MTB)
      if (this.onPave && this.grounded) {
        this.speed -= this.speed * (1 - this.bike.paveGrip) * 2.0 * dt;
        this.shake = Math.max(this.shake, Math.min(0.25, this.speed * 0.02));
      }
      this.z += this.speed * dt;
      this.maxSpeed = Math.max(this.maxSpeed, this.speed);

      if (!this.grounded) {
        this.vy -= GRAVITY * dt;
        this.y += this.vy * dt;
        const h = this.terrain.heightAt(this.z);
        if (this.y <= h) {
          this.y = h;
          this.vy = 0;
          this.grounded = true;
          this.shake = Math.max(this.shake, 0.25);
          sfx.land();
        }
      } else {
        // Kleven aan de weg is correct: crest-launch kan fysisch niet (zie ontwerp)
        this.y = this.terrain.heightAt(this.z);
      }

      // Botsingen en kasseien
      this.onPave = false;
      for (const o of this.world.obstacles.active) {
        const dz = this.z - o.z;
        if (o.pave) {
          if (Math.abs(dz) < o.d / 2 && this.grounded) this.onPave = true;
        } else if (Math.abs(dz) < o.d / 2 + 0.45 && this.y - o.oy < o.h - 0.06 && this.invuln <= 0) {
          this.crash();
          break;
        }
        if (!o.pave && !o.counted && dz > o.d / 2 + 0.6) {
          o.counted = true;
          this.jumpsCleared += 1;
        }
      }

      // Mijlpalen
      if (this.z >= this.nextMilestone) {
        const km = Math.round(this.nextMilestone / 1000);
        this.toast(`${km} km — ${MILESTONE_PHRASES[km % MILESTONE_PHRASES.length]}`);
        sfx.fanfare();
        this.nextMilestone += 1000;
      }
      // Col-detectie: gemiddelde stijging over de komende 100 m. Cooldown
      // van 600 m zodat één lange klim niet blijft toasten.
      if (this.z >= this.nextColCheck) {
        const rise = (this.terrain.heightAt(this.z + 100) - this.terrain.heightAt(this.z)) / 100;
        if (rise > 0.045) {
          this.toast(`COL ! ${Math.round(rise * 100)}% — ALLEZ !`);
          sfx.fanfare();
          this.nextColCheck = this.z + 600;
        } else {
          this.nextColCheck = this.z + 40;
        }
      }
    }

    if (this.crashed) {
      this.crashT += dt;
      this.slide = Math.max(0, this.slide - 6 * dt);
      this.z += this.slide * dt;
      this.rig.rotation.x -= dt * 6.5;
      this.rig.rotation.z = Math.sin(this.crashT * 9) * 0.3;
      // Bounce relatief aan het wegdek
      this.y = this.terrain.heightAt(this.z) + Math.abs(Math.sin(this.crashT * 7)) * 0.35 * Math.max(0, 1 - this.crashT / 1.6);
      if (this.crashT >= 1.6) {
        this.rig.rotation.set(0, 0, 0);
        this.y = this.terrain.heightAt(this.z);
        this.vy = 0;
        this.grounded = true;
        this.crashed = false;
        if (this.hearts <= 0) {
          this.finish();
          return;
        }
        this.invuln = 2;
      }
    } else {
      // Yaw volgt de wegas door de bocht (grijpt bewust NIET tijdens de
      // crash-tuimel, net als pitch/roll hieronder).
      this.rig.rotation.y = Math.atan(this.terrain.curveSlopeAt(this.z));
      // Pitch-lerp: op de grond volgt de neus de helling, in de lucht de
      // verticale snelheid.
      const pitch = this.grounded ? -Math.atan(this.terrain.slopeAt(this.z)) : -this.vy * 0.035;
      this.rig.rotation.x += (pitch - this.rig.rotation.x) * Math.min(1, dt * 10);
      // Leunen in de bocht: rolhoek uit centripetale versnelling v²·κ, met κ
      // als eindige differentie van de koers (analytische x'' is de ramp-term
      // niet waard). Negatief teken: top van de renner naar het bochtcentrum.
      const kappa = (this.terrain.curveSlopeAt(this.z + 3) - this.terrain.curveSlopeAt(this.z - 3)) / 6;
      const lean = Math.max(-0.32, Math.min(0.32, -Math.atan((this.speed * this.speed * kappa) / 9.8)));
      this.rig.rotation.z += (lean - this.rig.rotation.z) * Math.min(1, dt * 6);
    }

    if (this.invuln > 0) {
      this.invuln -= dt;
      this.rig.visible = Math.floor(this.time * 12) % 2 === 0;
      if (this.invuln <= 0) this.rig.visible = true;
    }

    // Animatie van benen, cranks en wielen
    this.pedalPhase += (this.pedalTarget - this.pedalPhase) * Math.min(1, dt * 9);
    const curveHere = this.terrain.curveAt(this.z);
    this.rig.position.set(curveHere, this.y, this.z);
    this.rig.userData.animate(dt, { phase: this.pedalPhase, speed: this.speed });

    // Camera volgt met lichte vertraging en snelheids-FOV; volgt h(z) én de
    // bochtige wegas x(z) zodat je over toppen en door bochten blijft kijken.
    // Gehoiste vectors: geen allocaties.
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const hHere = this.terrain.heightAt(this.z);
    const airLift = this.y - hHere;
    let lerpRate = 5;
    if (this.camMode === 1) {
      // Dichtbij, recht achter de renner.
      this._camTarget.set(
        this.terrain.curveAt(this.z - 3.4),
        2.0 + this.terrain.heightAt(this.z - 3.4) + airLift * 0.5,
        this.z - 3.4
      );
      this._look.set(this.terrain.curveAt(this.z + 6), 1.15 + this.terrain.heightAt(this.z + 6), this.z + 6);
    } else if (this.camMode === 2) {
      // Zijaanzicht: camera links van de renner (+x kant), kijkt iets vooruit —
      // wat komt zie je links in beeld, wat gepasseerd is rechts.
      this._camTarget.set(curveHere + 8, 2.1 + hHere + airLift * 0.4, this.z);
      this._look.set(this.terrain.curveAt(this.z + 3), 1.0 + hHere + airLift * 0.4, this.z + 3);
      lerpRate = 9; // strak meebewegen, anders drijft de renner uit beeld
    } else {
      // Veraf (origineel).
      this._camTarget.set(
        2.4 + this.terrain.curveAt(this.z - 7.5),
        3.1 + this.terrain.heightAt(this.z - 7.5) + airLift * 0.35,
        this.z - 7.5
      );
      this._look.set(this.terrain.curveAt(this.z + 9), 1.1 + this.terrain.heightAt(this.z + 9), this.z + 9);
    }
    this.camPos.lerp(this._camTarget, 1 - Math.exp(-dt * lerpRate));
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.35;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.35;
    }
    this.camera.lookAt(this._look);
    this.camera.fov = 62 + (this.speed / this.top) * 12;
    this.camera.updateProjectionMatrix();

    // Zon-frustum blijft gecentreerd op de speler, meedeinend met h(z) en x(z)
    this.sun.position.set(this.sunOff[0] + curveHere, this.sunOff[1] + hHere, this.z + this.sunOff[2]);
    this.sun.target.position.set(curveHere, hHere, this.z + 10);

    this.world.update(this.z, dt, this.time);

    // HUD
    this.hud.speed.textContent = String(Math.round(this.speed * 3.6));
    this.hud.dist.textContent = this.z < 1000 ? `${Math.floor(this.z)} m` : `${(this.z / 1000).toFixed(2)} km`;
  }

  finish() {
    this.frozen = true;
    this.hud.root.classList.add('hidden');
    this.hud.toast.classList.add('hidden');
    const newBest = this.z > this.best;
    if (newBest) localStorage.setItem('fiets.best', String(Math.floor(this.z)));
    this.cb.onGameOver({
      dist: this.z,
      jumps: this.jumpsCleared,
      maxSpeed: this.maxSpeed * 3.6,
      best: Math.max(this.best, Math.floor(this.z)),
      newBest,
      seed: this.seed,
    });
  }

  render(renderer) {
    renderer.render(this.scene, this.camera);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    clearTimeout(this._toastTimer);
    this.hud.root.classList.add('hidden');
    this.hud.countdown.classList.add('hidden');
    this.hud.toast.classList.add('hidden');
    this.world.dispose(); // gepoolde obstakels staan buiten de scene
    this.sun.dispose(); // ruimt de 2048² shadow-rendertarget deterministisch op
    disposeObject(this.scene);
  }
}
