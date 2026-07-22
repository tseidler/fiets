// De race zelf: trappen met R/U (of J vasthouden), springen met spatie,
// obstakels ontwijken.
import * as THREE from 'three';
import { World, ZONES, AMBIANCES } from './world.js';
import { Terrain } from './terrain.js';
import { RNG } from './rng.js';
import { buildRig, disposeObject } from './models.js';
import { PU_DEFS } from './powerups.js';
import { envMap } from './env.js';
import { sfx } from './audio.js';

const GRAVITY = 22;
const SLOPE_ACCEL = 9.0; // helling↔snelheid-koppeling (apart houden voor playtests)
// Auto-trappen (J vasthouden): CONTINUE acceleratie met hetzelfde gemiddelde
// vermogen als één pedaalslag per 0.28 s. Geen discrete snelheidspulsen, dus
// geen schokkend beeld (FOV en camera-lerp volgen de snelheid). Evenwicht
// ~14 m/s: bewust onder de top, zodat R/U-mashen blijft lonen.
const AUTO_PEDAL_INTERVAL = 0.28;
// Power-ups (zie powerups.js). BOOST: top ×2 gedurende 5 s. FEATHER: 1.5×
// spronghoogte (hoogte ~ vy², dus vy × √1.5) gedurende 10 s, met vy-cap zodat
// je niet uit beeld springt. STAR: 10 s onkwetsbaar met aura. Activeren: F.
const BOOST_DUR = 5;
const FEATHER_DUR = 10;
const STAR_DUR = 10;
const MAX_HEARTS = 5;
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
  constructor(renderer, char, bike, stage, cb) {
    this.renderer = renderer;
    this.char = char;
    this.bike = bike;
    this.stage = stage || null; // null = oneindig gegenereerd parcours
    this.kmFactor = stage ? stage.km / stage.length : 0;
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
    this.terrain = new Terrain(rng.fork(3), this.stage ? this.stage.profile : null);

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

    this.world = new World(this.scene, rng, this.ambiance, this.terrain, this.stage);
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
    this._autoHalf = 0;
    this.rideTime = 0;
    this.pedalPhase = 0;
    this.pedalTarget = 0;
    this.crashed = false;
    this.crashT = 0;
    this.invuln = 0;
    this.item = null; // opgeslagen power-up (id), activeren met ENTER
    this.boostT = 0;
    this.featherT = 0;
    this.starT = 0;
    this.aura = null; // lazy gebouwd bij eerste ster
    this._fxStr = '';
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
      item: el('hud-item'), itemIcon: el('item-icon'), itemFx: el('item-fx'),
    };
    this.hud.root.classList.remove('hidden');
    this.hud.best.textContent = this.best > 0 ? `Record: ${(this.best / 1000).toFixed(2)} km` : '';
    this.updateHearts();
    this.updateItemSlot();
    this.hud.itemFx.textContent = '';
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

    if (e.code === 'KeyF') { this.useItem(); return; }
    if (e.code === 'KeyR' || e.code === 'KeyU') {
      const key = e.code === 'KeyR' ? 'r' : 'u';
      if (key !== this.lastKey) {
        this.pedalStroke(key);
      } else {
        // Zelfde toets twee keer: bijna geen kracht
        this.speed += this.power * 0.1 * Math.max(0.15, 1 - this.speed / this.effTop);
        sfx.badPedal();
      }
    } else if (e.code === 'Space' && this.grounded) {
      this.grounded = false;
      // Bergop werkt als schans; bergaf geen aftrek (obstakels blijven haalbaar).
      const s = this.terrain.slopeAt(this.z);
      let vy = (6.6 + Math.min(this.speed, 16) * 0.07) * this.jumpMod + Math.max(0, s) * this.speed;
      // Veertje: 1.5× spronghoogte ⇒ vy × √1.5; cap houdt de renner in beeld.
      if (this.featherT > 0) vy = Math.min(13, vy * Math.sqrt(1.5));
      this.vy = vy;
      sfx.jump();
    }
  }

  // Volle pedaalslag bij goed afwisselend R/U-werk (J-modus accelereert
  // continu in update() en komt hier niet).
  // Effectieve topsnelheid: paddestoel-boost verdubbelt hem tijdelijk.
  get effTop() {
    return this.boostT > 0 ? this.top * 2 : this.top;
  }

  pedalStroke(key) {
    // Boven effTop (uitrazende boost) geeft trappen niets; nooit terugklemmen.
    const cap = this.effTop;
    if (this.speed < cap) this.speed = Math.min(cap, this.speed + this.power * Math.max(0.15, 1 - this.speed / cap));
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
    // Hartjes-power-up kan boven de start-3 uitkomen (tot MAX_HEARTS).
    this.hud.hearts.textContent = '❤'.repeat(this.hearts) + '♡'.repeat(Math.max(0, 3 - this.hearts));
  }

  updateItemSlot() {
    const def = this.item ? PU_DEFS[this.item] : null;
    this.hud.itemIcon.textContent = def ? def.icon : '';
    this.hud.item.classList.toggle('full', !!def);
  }

  useItem() {
    if (!this.item) return;
    if (this.item === 'heart' && this.hearts >= MAX_HEARTS) {
      this.toast('LEVENS VOL !', 1100); // item niet verspillen
      return;
    }
    const id = this.item;
    this.item = null;
    this.updateItemSlot();
    if (id === 'mushroom') {
      this.boostT = BOOST_DUR;
      this.toast('🍄 TURBO !', 1300);
    } else if (id === 'feather') {
      this.featherT = FEATHER_DUR;
      this.toast('🪶 VEDERLICHT !', 1300);
    } else if (id === 'star') {
      this.starT = STAR_DUR;
      if (!this.aura) this.buildAura();
      this.aura.visible = true;
      this.toast('⭐ SUPERKRACHT !', 1300);
    } else if (id === 'heart') {
      this.hearts += 1;
      this.updateHearts();
      this.toast('❤️ +1 LEVEN !', 1300);
    }
    sfx.powerup();
  }

  // Ster-aura: twee additieve schillen (geel binnen, blauw buiten) om renner
  // en fiets; pulseert in update() als blauw/gele vlam.
  buildAura() {
    this.aura = new THREE.Group();
    const mk = (color, opacity, sx, sy, sz, side) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 14),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side })
      );
      m.scale.set(sx, sy, sz);
      this.aura.add(m);
      return m;
    };
    this.auraIn = mk(0xffd600, 0.3, 0.85, 1.05, 1.5, THREE.FrontSide);
    this.auraOut = mk(0x3d8bff, 0.24, 1.0, 1.22, 1.72, THREE.BackSide);
    this.aura.position.y = 0.95;
    this.rig.add(this.aura);
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
        if (this.stage) this.toast(`ÉTAPE : ${this.stage.name}`, 2600);
      }
    }
    if (this.phase === 'riding') this.rideTime += dt; // incl. crash-tijd: straf telt mee

    // Power-up-timers lopen in echte rijtijd door (ook tijdens een crash).
    if (this.boostT > 0) this.boostT -= dt;
    if (this.featherT > 0) this.featherT -= dt;
    if (this.starT > 0) {
      this.starT -= dt;
      // Blauw/gele vlam: schillen pulseren in tegenfase, licht flakkerend.
      const p = this.time * 10;
      this.aura.scale.set(1 + Math.sin(p) * 0.07, 1 + Math.sin(p * 1.35) * 0.09, 1 + Math.cos(p * 0.9) * 0.07);
      this.auraIn.material.opacity = 0.3 + Math.sin(p) * 0.14;
      this.auraOut.material.opacity = 0.24 + Math.cos(p) * 0.12;
      // Laatste 1.5 s: knipperen als waarschuwing dat de superkracht afloopt.
      this.aura.visible = this.starT > 1.5 || Math.floor(this.time * 8) % 2 === 0;
      if (this.starT <= 0) this.aura.visible = false;
    }

    if (this.phase === 'riding' && !this.crashed) {
      // Auto-trappen: continue acceleratie (zelfde gemiddelde vermogen als
      // discrete slagen, maar zonder pulsen). De cranks draaien vloeiend mee,
      // iets sneller naarmate je harder rijdt; het HUD-tikje en de R/U-chips
      // wisselen per halve omwenteling.
      if (this.jHeld) {
        const cap = this.effTop;
        if (this.speed < cap) {
          this.speed = Math.min(
            cap,
            this.speed + (this.power / AUTO_PEDAL_INTERVAL) * Math.max(0.15, 1 - this.speed / cap) * dt
          );
        }
        const cadence = 0.55 + 0.65 * Math.min(1.25, this.speed / this.top);
        this.pedalTarget += (Math.PI / AUTO_PEDAL_INTERVAL) * cadence * dt;
        const half = Math.floor(this.pedalTarget / Math.PI);
        if (half !== this._autoHalf) {
          this._autoHalf = half;
          const key = this.lastKey === 'r' ? 'u' : 'r';
          sfx.pedal(key === 'r');
          this.lastKey = key;
          this.setExpectedKey(key === 'r' ? 'u' : 'r');
        }
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
      // Paddestoel: trek actief naar 2× top (geen getrap nodig tijdens boost).
      if (this.boostT > 0) {
        this.speed += (this.effTop - this.speed) * Math.min(1, dt * 2.5);
      }
      // Helling↔snelheid: bergop remt, bergaf versnelt (gecapt op 1.25× top).
      // De cap klemt alleen wat de afdaling er dit frame bij doet — restsnelheid
      // van een uitgewerkte boost mag natuurlijk uitrollen via de drag.
      const slope = this.terrain.slopeAt(this.z);
      if (this.grounded) {
        const before = this.speed;
        this.speed -= SLOPE_ACCEL * slope * dt;
        if (slope < 0) this.speed = Math.min(this.speed, Math.max(before, this.effTop * 1.25));
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

      // Finishlijn van een etappe gehaald: gewonnen!
      if (this.stage && this.z >= this.stage.length) {
        sfx.fanfare();
        this.finish(true);
        return;
      }

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
        } else if (Math.abs(dz) < o.d / 2 + 0.45 && this.y - o.oy < o.h - 0.06 && this.invuln <= 0 && this.starT <= 0) {
          this.crash();
          break;
        }
        if (!o.pave && !o.counted && dz > o.d / 2 + 0.6) {
          o.counted = true;
          this.jumpsCleared += 1;
        }
      }

      // Spring-hint bij de eerste power-up die je nadert: leg één keer per
      // rit uit hoe je hem pakt.
      if (!this._puHint) {
        for (const p of this.world.powerups.active) {
          if (p.z > this.z && p.z - this.z < 45) {
            this._puHint = true;
            this.toast('SPRING (spatie) om de power-up te pakken!', 2200);
            break;
          }
        }
      }
      // Power-up pakken: alleen al springend (drempel 0.65 m boven het wegdek,
      // de bubbel hangt op FLOAT_H=2.3) en met een leeg slot — anders blijft
      // de bubbel gewoon hangen.
      if (!this.item) {
        for (const p of this.world.powerups.active) {
          if (Math.abs(this.z - p.z) < 1.35 && this.y - p.oy > 0.65) {
            this.world.powerups.collect(p);
            this.item = p.id;
            this.updateItemSlot();
            const def = PU_DEFS[p.id];
            this.toast(`${def.icon} ${def.name} — druk F`, 1600);
            sfx.pickup();
            break;
          }
        }
      }

      // Mijlpalen (in etappe-modus in "echte" kilometers)
      if (this.z >= this.nextMilestone) {
        const km = Math.round(this.nextMilestone / 1000);
        const label = this.stage ? Math.round(this.nextMilestone * this.kmFactor) : km;
        this.toast(`${label} km — ${MILESTONE_PHRASES[km % MILESTONE_PHRASES.length]}`);
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
      // Ster-aura overstemt de invuln-knipper: renner blijft zichtbaar.
      this.rig.visible = this.starT > 0 || Math.floor(this.time * 12) % 2 === 0;
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
    // Ratio-cap: tijdens de turbo-boost mag de FOV extra open (snelheidsgevoel),
    // maar niet onbeperkt.
    this.camera.fov = 62 + Math.min(1.7, this.speed / this.top) * 12;
    this.camera.updateProjectionMatrix();

    // Zon-frustum blijft gecentreerd op de speler, meedeinend met h(z) en x(z)
    this.sun.position.set(this.sunOff[0] + curveHere, this.sunOff[1] + hHere, this.z + this.sunOff[2]);
    this.sun.target.position.set(curveHere, hHere, this.z + 10);

    this.world.update(this.z, dt, this.time);

    // HUD — in etappe-modus telt de teller in "echte" kilometers naar de finish
    this.hud.speed.textContent = String(Math.round(this.speed * 3.6));
    this.hud.dist.textContent = this.stage
      ? `${(this.z * this.kmFactor).toFixed(1)} / ${this.stage.km} km`
      : this.z < 1000 ? `${Math.floor(this.z)} m` : `${(this.z / 1000).toFixed(2)} km`;
    // Actieve effecten met aftellende seconden naast het item-slot.
    let fx = '';
    if (this.boostT > 0) fx += `🍄 ${Math.ceil(this.boostT)}  `;
    if (this.featherT > 0) fx += `🪶 ${Math.ceil(this.featherT)}  `;
    if (this.starT > 0) fx += `⭐ ${Math.ceil(this.starT)}`;
    if (fx !== this._fxStr) {
      this._fxStr = fx;
      this.hud.itemFx.textContent = fx;
    }
  }

  finish(won = false) {
    this.frozen = true;
    this.hud.root.classList.add('hidden');
    this.hud.toast.classList.add('hidden');
    const newBest = this.z > this.best;
    if (newBest) localStorage.setItem('fiets.best', String(Math.floor(this.z)));
    this.cb.onGameOver({
      dist: this.z,
      distLabel: this.stage
        ? `${(Math.min(this.z, this.stage.length) * this.kmFactor).toFixed(1)} / ${this.stage.km} km`
        : `${(this.z / 1000).toFixed(2)} km`,
      jumps: this.jumpsCleared,
      maxSpeed: this.maxSpeed * 3.6,
      best: Math.max(this.best, Math.floor(this.z)),
      newBest,
      seed: this.seed,
      won,
      time: this.rideTime,
      stageName: this.stage ? this.stage.name : null,
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
