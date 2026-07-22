// Gedetailleerde fiets- en rennermodellen, opgebouwd uit Three.js-primitieven
// met gegenereerde canvas-textures (zie textures.js). Geen externe assets.
// De fiets kijkt in de +z-richting (rijrichting); rig-origin op y=0.
import * as THREE from 'three';
import {
  jerseyTexture, faceTexture, helmetTexture, tireTexture,
  frameDecalTexture, discTexture, sockTexture, isLightColor,
} from './textures.js';
import { buildModelBike } from './bikeModels.js';

const UP = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const WHEEL_R = 0.34;

// Rugnummers per karakter (ids uit data.js); trui-soort als fallback.
const NUMBERS = { jef: 1, pien: 51, bram: 11 };
const KIND_NUMBERS = { yellow: 1, polka: 51, green: 11 };
// Sok-accent per trui (pien's witte helm zou onzichtbare strepen geven).
const SOCK_ACCENT = { yellow: 0xdca800, polka: 0xe02020, green: 0x1d8a3a };

function tube(a, b, r, mat, seg = 16) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// Open cilinder-shell (theta-venster gecentreerd op ±x) net boven de buis,
// zodat decal-tekst niet om de buis heen wikkelt. Zelfde plaatsing als tube().
function decalShell(a, b, r, tex, side) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const arc = 1.9; // rad zichtbaar venster
  const geo = new THREE.CylinderGeometry(
    r * 1.03, r * 1.03, len * 0.55, 24, 1, true,
    (side > 0 ? Math.PI / 2 : Math.PI * 1.5) - arc / 2, arc
  );
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: 0.4, metalness: 0.1,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }));
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  m.userData.noShadow = true; // transparante shell hoort geen schaduw te werpen
  return m;
}

export function jerseyMaterial(kind) {
  return new THREE.MeshStandardMaterial({
    map: jerseyTexture(kind, KIND_NUMBERS[kind] ?? 1),
    roughness: 0.6,
  });
}

export function buildBike(def) {
  const g = new THREE.Group();
  const isMtb = def.type === 'mtb';
  // Carbon is geen metaal: lage metalness + gladde clear-coat (lage roughness)
  // geeft de diepe glans van een carbon-racekader; MTB iets matter.
  const frame = new THREE.MeshStandardMaterial({
    color: def.color, roughness: isMtb ? 0.4 : 0.22, metalness: 0.0, envMapIntensity: 1.2,
  });
  const carbonDark = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.28, metalness: 0.0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x191a1f, roughness: 0.9 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xb8bec8, roughness: 0.4, metalness: 0.8 });
  const gun = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.45, metalness: 0.7 });
  const rubber = new THREE.MeshStandardMaterial({ map: tireTexture(isMtb ? 'mtb' : 'race'), roughness: 0.95 });
  const discM = isMtb
    ? new THREE.MeshStandardMaterial({ map: discTexture(), roughness: 0.35, metalness: 0.75 })
    : null;
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.3, metalness: 0.85 });
  // Racekader: dikkere aero-buizen (carbon); MTB: robuuste buizen.
  const r = isMtb ? 0.042 : 0.036;

  // Ankerpunten — BB/assen exact contract; zadelknoop en balhoofd per type,
  // naar referentiefoto's (Look 795 racefiets / Orbea Occam MTB):
  // race = bijna horizontale bovenbuis + zadel boven het stuur;
  // MTB = sterk aflopende bovenbuis + hoog balhoofd, zadel op lange pen.
  const BB = V(0, 0.42, 0.02);      // trapas
  const RH = V(0, WHEEL_R, -0.55);  // achteras
  const FH = V(0, WHEEL_R, 0.55);   // vooras
  const HEADB = V(0, 0.82, 0.46);   // balhoofd onder
  const SEATC = isMtb ? V(0, 0.80, -0.15) : V(0, 0.90, -0.195); // zadelknoop
  const HEADT = isMtb ? V(0, 1.02, 0.41) : V(0, 0.96, 0.425);   // balhoofd boven
  const SADDLE = V(0, 1.0, -0.275); // zadelpen-top: net onder het bekken (1.0)
                                    // zodat het zadel niet door de renner steekt

  function wheel() {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R, isMtb ? 0.062 : 0.032, 16, 48), rubber);
    tire.rotation.y = Math.PI / 2;
    w.add(tire);
    // Race: diepe donkere aero-velg; MTB: bredere alu-velg.
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, isMtb ? 0.016 : 0.026, 10, 40), isMtb ? alu : gun);
    rim.rotation.y = Math.PI / 2;
    w.add(rim);
    // 12 spaken = 6 doorlopende cilinders in het wielvlak (YZ).
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(isMtb ? 0.006 : 0.004, isMtb ? 0.006 : 0.004, 0.56, 5), alu);
      s.rotation.x = (i * Math.PI) / 6;
      w.add(s);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 12), alu);
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    // Ventiel op de velg, radiaal — geeft de spin "leven".
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), alu);
    valve.position.set(0, Math.cos(0.6) * 0.275, Math.sin(0.6) * 0.275);
    valve.rotation.x = 0.6;
    w.add(valve);
    if (isMtb) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.008, 24), discM);
      disc.rotation.z = Math.PI / 2;
      disc.position.x = 0.05;
      w.add(disc);
    }
    return w;
  }

  const wheelB = wheel();
  wheelB.position.copy(RH);
  const wheelF = wheel();
  wheelF.position.copy(FH);
  g.add(wheelB, wheelF);

  // Hoofddriehoek (20 segmenten): dikke onderbuis, slanke bovenbuis.
  g.add(tube(BB, SEATC, r, frame, 20), tube(BB, HEADB, r * 1.3, frame, 20), tube(SEATC, HEADT, r * 0.92, frame, 20));
  for (const s of [-1, 1]) {
    const o = V(0.045 * s, 0, 0);
    g.add(tube(BB.clone().add(o), RH.clone().add(o), r * (isMtb ? 0.75 : 0.55), frame, 12));
    g.add(tube(SEATC.clone().add(o), RH.clone().add(o), r * (isMtb ? 0.7 : 0.45), frame, 12));
    if (isMtb) {
      // Verende voorvork: gouden stanchions boven, dikke donkere lowers onder.
      const MID = V(0.045 * s, 0.62, 0.505);
      g.add(tube(HEADB.clone().add(o), MID, r * 0.85, gold, 10));
      g.add(tube(MID, FH.clone().add(o), r * 1.3, dark, 10));
    } else {
      g.add(tube(HEADB.clone().add(o), FH.clone().add(o), r * 0.7, frame, 12));
    }
  }
  if (isMtb) {
    g.add(box(0.13, 0.05, 0.06, frame, 0, 0.78, 0.465)); // vorkkroon
    // Demper in het frame: full-suspension-look (gouden schacht + donker huis).
    g.add(tube(V(0, 0.88, 0.16), V(0, 0.74, 0.11), 0.018, gold, 8));
    g.add(tube(V(0, 0.74, 0.11), V(0, 0.56, 0.05), 0.034, dark, 10));
  }

  // Decal-shells met tekst op onderbuis ("FIETS!") en bovenbuis (fietsnaam).
  // flip=true op de rechterkant zodat de tekst op beide kanten rechtop leest.
  const light = isLightColor(def.color);
  for (const s of [1, -1]) {
    g.add(decalShell(BB, HEADB, r * 1.3, frameDecalTexture('FIETS!', light, s > 0), s));
    g.add(decalShell(SEATC, HEADT, r * 0.92, frameDecalTexture(def.name, light, s > 0), s));
  }

  // Balhoofd + stuurpen: race = lange pen naar een láág stuur (zadel boven
  // stuur, agressieve zit); MTB = korte hoge pen.
  const STEER = isMtb ? V(0, 1.07, 0.435) : V(0, 1.0, 0.435);
  const BARC = isMtb ? V(0, 1.1, 0.47) : V(0, 1.02, 0.5);
  g.add(tube(HEADB, STEER, r, frame, 12));
  g.add(tube(STEER, BARC, r * 0.8, alu, 10));

  if (isMtb) {
    // Brede riser-bar met dikke grips, remhendels en remklauwen bij de schijven.
    g.add(tube(V(-0.31, 1.1, 0.47), V(0.31, 1.1, 0.47), 0.014, alu, 12));
    for (const s of [-1, 1]) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.12, 10), dark);
      grip.rotation.z = Math.PI / 2;
      grip.position.set(s * 0.25, 1.1, 0.47);
      g.add(grip);
      g.add(box(0.07, 0.016, 0.02, dark, s * 0.16, 1.095, 0.5));        // remhendel
      g.add(box(0.03, 0.06, 0.05, dark, 0.05, 0.41, s > 0 ? 0.505 : -0.505)); // remklauw
    }
  } else {
    // Race drop-bar: topstuur + torus-bogen die naar voren-onder krullen + hoods.
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.40, 12), carbonDark);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 1.02, 0.5);
    g.add(topBar);
    for (const s of [-1, 1]) {
      const drop = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.019, 8, 14, Math.PI * 1.2), dark);
      drop.position.set(s * 0.20, 0.958, 0.5);
      drop.rotation.y = Math.PI / 2;
      drop.rotation.x = -0.25;
      g.add(drop);
      const hood = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.05, 3, 8), dark);
      hood.position.set(s * 0.20, 1.0, 0.56);
      hood.rotation.x = -1.0;
      g.add(hood);
    }
  }

  // Lange blootliggende zadelpen (race: slank carbon; MTB: dikke dropper).
  g.add(tube(SEATC, SADDLE, isMtb ? r * 0.75 : r * 0.5, isMtb ? dark : carbonDark, 10));
  g.add(box(0.13, 0.04, 0.28, dark, 0, SADDLE.y - 0.02, -0.29));
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), dark);
  nose.scale.set(1.15, 0.5, 1.8);
  nose.position.set(0, SADDLE.y - 0.015, -0.17);
  g.add(nose);

  // Aandrijving: kettingblad + spider op de crank, cranks en pedalen.
  const crank = new THREE.Group();
  crank.position.copy(BB);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 28), gun);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = 0.06;
  crank.add(ring);
  for (let i = 0; i < 4; i++) {
    const spider = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.15, 0.03), gun);
    spider.position.x = 0.055;
    spider.rotation.x = (i * Math.PI) / 4;
    crank.add(spider);
  }
  crank.add(box(0.03, 0.17, 0.045, alu, 0.09, -0.085, 0));
  crank.add(box(0.03, 0.17, 0.045, alu, -0.09, 0.085, 0));
  // Pedalen als sub-groups met pivot op het crank-arm-uiteinde; animate houdt
  // ze horizontaal via p.rotation.x = -phase.
  const pedals = [];
  for (const s of [1, -1]) {
    const p = new THREE.Group();
    p.position.set(s * 0.14, s * -0.17, 0);
    p.add(box(0.12, 0.025, 0.08, dark, 0, 0, 0));
    crank.add(p);
    pedals.push(p);
  }
  g.add(crank);

  // Cassette op de achternaaf (draait mee met het achterwiel).
  for (let i = 0; i < 3; i++) {
    const cog = new THREE.Mesh(new THREE.TorusGeometry(0.045 - i * 0.007, 0.006, 6, 20), gun);
    cog.rotation.y = Math.PI / 2;
    cog.position.x = 0.045 + i * 0.009;
    wheelB.add(cog);
  }
  // Achterderailleur-doosje.
  g.add(box(0.025, 0.07, 0.035, gun, 0.05, 0.25, -0.58));

  // Ketting-suggestie: gesloten lus om kettingblad (r≈0.10) en cassette
  // (r≈0.045) in het YZ-vlak, als tube op x=0.06.
  const chainPts = [
    [0.02, 0.52], [0.12, 0.42], [0.09, 0.35], [0.02, 0.32],       // om het blad
    [-0.16, 0.312], [-0.36, 0.30],                                 // onderloop
    [-0.55, 0.295], [-0.595, 0.34], [-0.55, 0.385],                // om de cassette
    [-0.36, 0.43], [-0.16, 0.475],                                 // bovenloop
  ];
  const chainCurve = new THREE.CatmullRomCurve3(chainPts.map(([z, y]) => V(0, y, z)), true);
  const chain = new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 48, 0.008, 6, true), gun);
  chain.position.x = 0.06;
  g.add(chain);

  // Bidon + houder op de zadelbuis, evenwijdig aan SEATC–BB.
  const seatDir = new THREE.Vector3().subVectors(SEATC, BB).normalize();
  const bidon = new THREE.Group();
  bidon.position.set(0, 0.66, -0.088);
  bidon.quaternion.setFromUnitVectors(UP, seatDir);
  const bottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.034, 0.15, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5f6f8, roughness: 0.35 })
  );
  bidon.add(bottle);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.035, 10), dark);
  cap.position.y = 0.09;
  bidon.add(cap);
  for (const yy of [-0.055, 0.0]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.006, 6, 12, Math.PI * 1.4), alu);
    hoop.rotation.x = Math.PI / 2;
    hoop.rotation.z = Math.PI; // opening van de houder naar voren
    hoop.position.y = yy;
    bidon.add(hoop);
  }
  g.add(bidon);

  g.userData = { wheelF, wheelB, crank, pedals };
  return g;
}

// Houding per fietstype (referentiefoto's): race = platte rug, diepe tuck,
// handen op de hoods, ellebogen ingeklapt; MTB = rechterop, ellebogen wijd,
// handen op de brede grips, helm met grote klep.
export function buildRider(char, bike) {
  const isMtb = bike?.type === 'mtb';
  const g = new THREE.Group();
  const number = NUMBERS[char.id] ?? KIND_NUMBERS[char.jersey] ?? 1;
  const jersey = new THREE.MeshStandardMaterial({ map: jerseyTexture(char.jersey, number), roughness: 0.6 });
  const sleeveColor = { yellow: 0xffd600, polka: 0xffffff, green: 0x27b04b }[char.jersey] ?? 0xffffff;
  const sleeve = new THREE.MeshStandardMaterial({ color: sleeveColor, roughness: 0.6 });
  const skin = new THREE.MeshStandardMaterial({ color: char.skin, roughness: 0.7 });
  const faceM = new THREE.MeshStandardMaterial({ map: faceTexture(char.skin), roughness: 0.7 });
  const lycra = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.8 });
  const helmetM = new THREE.MeshStandardMaterial({ map: helmetTexture(char.helmet), roughness: 0.35 });
  const visorM = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.15, metalness: 0.4 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 });
  const sockM = new THREE.MeshStandardMaterial({
    map: sockTexture(SOCK_ACCENT[char.jersey] ?? 0x17181c), roughness: 0.7,
  });

  // Bekken/broek: platte, hoekige vorm (geen ronde bal) die het zadel bedekt
  // zodat het er niet meer doorheen steekt.
  const HIP = V(0, 1.0, -0.2);
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.17, 0.31), lycra);
  hips.position.set(0, 1.0, -0.2);
  hips.rotation.x = 0.32;
  g.add(hips);

  // Romp: getailleerde kegel (brede schouders → smalle taille), afgeplat van
  // voor naar achter — atletisch i.p.v. rond. Trui-texture: borst op u=0.25.
  const torso = new THREE.Group();
  torso.position.copy(HIP);
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.14, 0.46, 20), jersey);
  chest.scale.set(1.05, 1, 0.64);
  chest.position.y = 0.26;
  torso.add(chest);
  // Schouderkap sluit de bovenkant netjes af.
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.175, 16, 10), jersey);
  shoulders.scale.set(1.05, 0.6, 0.64);
  shoulders.position.y = 0.48;
  torso.add(shoulders);
  torso.rotation.x = isMtb ? 0.74 : 1.02;
  g.add(torso);

  // Hoofd met gezicht + neus, helm met vents; positie volgt de romphoek.
  const headG = new THREE.Group();
  headG.position.set(0, isMtb ? 1.42 : 1.31, isMtb ? 0.14 : 0.27);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), faceM);
  headG.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), skin);
  nose.position.set(0, -0.03, 0.105);
  headG.add(nose);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 18), helmetM);
  helm.scale.set(1, 0.8, 1.15);
  helm.position.y = 0.05;
  headG.add(helm);
  if (isMtb) {
    // MTB-helm heeft een grote klep; wegrenners rijden zonder.
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.015, 0.09), visorM);
    visor.position.set(0, 0.035, 0.125);
    visor.rotation.x = -0.45;
    headG.add(visor);
  }
  g.add(headG);

  // Armen: schouder → elleboog (mouw) → stuur (huid), met handschoen-bolletjes.
  // Race: laag op de hoods, ellebogen ingeklapt; MTB: wijd op de brede bar.
  for (const s of [-1, 1]) {
    const sh = V(0.17 * s, isMtb ? 1.31 : 1.22, isMtb ? 0.08 : 0.16);
    const el = isMtb ? V(0.23 * s, 1.2, 0.26) : V(0.18 * s, 1.1, 0.33);
    const hd = isMtb ? V(0.24 * s, 1.11, 0.46) : V(0.2 * s, 1.01, 0.55);
    g.add(tube(sh, el, 0.048, sleeve, 10));
    g.add(tube(el, hd, 0.037, skin, 10));
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), sleeve);
    shoulder.position.copy(sh);
    g.add(shoulder);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), shoe);
    glove.position.copy(hd);
    g.add(glove);
  }

  // Benen met knie-scharnier voor de trapanimatie. Ankerpunten exact:
  // hip (±0.1, 1.0, -0.18), knee.y = -0.42, schoen knee-lokaal (0, -0.41, 0.03).
  const mkLeg = (s) => {
    const hip = new THREE.Group();
    hip.position.set(0.1 * s, 1.0, -0.18);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.30, 5, 14), lycra);
    thigh.position.y = -0.21;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    const kneecap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lycra);
    knee.add(kneecap);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.28, 4, 12), skin);
    shin.position.y = -0.2;
    knee.add(shin);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 10), sockM);
    sock.position.set(0, -0.35, 0.005);
    knee.add(sock);
    // Wielerschoen: zool + neus + klittenbandjes.
    const foot = new THREE.Group();
    foot.position.set(0, -0.41, 0.03);
    foot.add(box(0.08, 0.05, 0.19, shoe, 0, 0.005, 0));
    foot.add(box(0.085, 0.02, 0.21, lycra, 0, -0.022, 0.01));
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), shoe);
    toe.scale.set(1, 0.6, 1.4);
    toe.position.set(0, -0.005, 0.095);
    foot.add(toe);
    foot.add(box(0.082, 0.012, 0.028, lycra, 0, 0.032, 0.02));
    foot.add(box(0.082, 0.012, 0.028, lycra, 0, 0.032, -0.035));
    knee.add(foot);
    hip.add(knee);
    g.add(hip);
    return { hip, knee };
  };
  g.userData = { legR: mkLeg(1), legL: mkLeg(-1) };
  return g;
}

// 2-bone inverse kinematics zodat de voeten exact de pedalen volgen. Dit
// vervangt de oude forward-kinematica die de benen de verkeerde kant op liet
// draaien. Alles in het YZ-vlak (x = zijkant, genegeerd). Zie buildBike voor
// de ankerpunten: hip (1.0, -0.18), trapas (0.42, 0.02), crankarm 0.17.
const IK_HIPY = 1.0, IK_HIPZ = -0.18;
const IK_BBY = 0.42, IK_BBZ = 0.02, IK_PEDR = 0.17;
const IK_L1 = 0.42, IK_L2 = 0.41; // dij, scheen
const IK_KNEE = 1; // teken van de elleboog-oplossing (knie naar voren)

function solveLegIK(leg, ty, tz) {
  let wy = IK_HIPY - ty, wz = IK_HIPZ - tz;
  let d = Math.hypot(wy, wz);
  const hi = IK_L1 + IK_L2 - 0.02;
  if (d < 0.03) d = 0.03; else if (d > hi) d = hi;
  const gamma = Math.atan2(wz, wy);
  let cosB = (IK_L1 * IK_L1 + d * d - IK_L2 * IK_L2) / (2 * IK_L1 * d);
  cosB = cosB < -1 ? -1 : cosB > 1 ? 1 : cosB;
  const phi1 = gamma - IK_KNEE * Math.acos(cosB);
  const delta = Math.atan2(wz - IK_L1 * Math.sin(phi1), wy - IK_L1 * Math.cos(phi1));
  leg.hip.rotation.x = phi1;
  leg.knee.rotation.x = delta - phi1;
}

// Renner + fiets als één rig, met animate(dt, {phase, speed}).
// Alles hangt strikt onder deze group (crash-animatie roteert de hele rig).
export function buildRig(char, bike) {
  const g = new THREE.Group();
  // Extern GLB-model als dat er is (zie bikeModels.js), anders procedureel.
  const b = buildModelBike(bike) ?? buildBike(bike);
  const r = buildRider(char, bike);
  g.add(b, r);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = !o.userData.noShadow;
  });
  const { wheelF, wheelB, crank, pedals, anchors } = b.userData;
  // IK-ankers van het model (trapas + cranklengte) als die er zijn.
  const A = anchors ?? { bbY: IK_BBY, bbZ: IK_BBZ, pedR: IK_PEDR };
  const pedal0 = pedals[0];
  const pedal1 = pedals[1];
  const { legL, legR } = r.userData;
  // Hot loop: uitsluitend scalaire operaties, nul allocaties.
  g.userData.animate = (dt, { phase = 0, speed = 0 } = {}) => {
    wheelF.rotation.x += (speed * dt) / WHEEL_R;
    wheelB.rotation.x += (speed * dt) / WHEEL_R;
    crank.rotation.x = phase;
    pedal0.rotation.x = -phase;
    pedal1.rotation.x = -phase;
    // Voeten volgen de pedalen exact via IK. Doel = pedaalmidden + kleine
    // opwaartse offset zodat de zool op het pedaal rust. Rechter- en linkerbeen
    // staan een halve slag uit fase (pedalen tegenover elkaar).
    const cp = Math.cos(phase), sp = Math.sin(phase);
    solveLegIK(legR, A.bbY - A.pedR * cp + 0.05, A.bbZ - A.pedR * sp);
    solveLegIK(legL, A.bbY + A.pedR * cp + 0.05, A.bbZ + A.pedR * sp);
  };
  return g;
}

// Ruimt geometrie, materialen en textures op, maar slaat alles over dat met
// userData.shared gemarkeerd is (de gecachte textures uit textures.js).
// World-textures hebben die vlag niet en worden dus wél gedisposed.
export function disposeObject(root) {
  root.traverse((o) => {
    // InstancedMesh.dispose() vuurt het dispose-event dat de renderer nodig
    // heeft om instanceMatrix-buffers uit zijn attribute-cache te verwijderen.
    if (o.isInstancedMesh) o.dispose();
    // Meshes van gedeelde fietsmodel-templates (bikeModels.js) houden hun
    // geometrie: clones in showroom én race delen dezelfde buffers.
    if (o.geometry && !o.userData.shared) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.userData && m.userData.shared) continue;
        if (m.map && !m.map.userData.shared) m.map.dispose();
        if (m.bumpMap && !m.bumpMap.userData.shared) m.bumpMap.dispose();
        m.dispose();
      }
    }
  });
}
