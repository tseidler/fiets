// Canvas-texture-generatoren voor de modellen (trui, gezicht, helm, banden,
// frame-decals, remschijf, sokken). Alle textures zijn power-of-two, sRGB,
// anisotropy 4 en worden module-breed gecachet (Map, gekeyed op parameters).
// Elke gecachte texture krijgt userData.shared = true zodat disposeObject in
// models.js ze overslaat: buildRig wordt bij elke menu-toets opnieuw gebouwd
// en zonder cache/vlag zouden de textures na één navigatie kapot zijn.
import * as THREE from 'three';

const cache = new Map();

// 0xff8800 of '#ff8800' → '#ff8800'
function css(hex) {
  return typeof hex === 'number' ? `#${hex.toString(16).padStart(6, '0')}` : String(hex);
}

function luminance(hex) {
  const n = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

// Voor decals: bepaalt of een framekleur "licht" is (donkere tekst nodig).
export function isLightColor(hex) {
  return luminance(hex) > 0.6;
}

function makeTex(key, w, h, draw, repeatX = 0) {
  let t = cache.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeatX > 0) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, 1);
  }
  t.userData.shared = true;
  cache.set(key, t);
  return t;
}

const JERSEY_BASE = { yellow: '#ffd600', polka: '#ffffff', green: '#27b04b' };
const JERSEY_SIDE = { yellow: '#d9b000', polka: '#e2e2e6', green: '#1d8a3a' };

// Trui voor de capsule-torso (r178 CapsuleGeometry: u=0.25 = borst,
// u=0.75 = rug, cilinderdeel v≈0.30–0.70; canvas-y = (1-v)*512).
export function jerseyTexture(kind, number = 1) {
  return makeTex(`jersey:${kind}:${number}`, 512, 512, (g) => {
    g.fillStyle = JERSEY_BASE[kind] ?? '#ffffff';
    g.fillRect(0, 0, 512, 512);

    // Donkere zijpanelen rond u=0 en u=0.5 (zijkanten, naad onder de arm).
    g.fillStyle = JERSEY_SIDE[kind] ?? '#e0e0e0';
    g.fillRect(0, 0, 36, 512);
    g.fillRect(476, 0, 36, 512);
    g.fillRect(228, 0, 56, 512);

    // Bolletjes over het hele vlak (geïntegreerd, geen aparte repeat-texture).
    if (kind === 'polka') {
      g.fillStyle = '#e02020';
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          g.beginPath();
          g.arc(x * 54 + 27 + (y % 2 ? 27 : 0), y * 54 + 27, 12, 0, Math.PI * 2);
          g.fill();
        }
      }
    }

    // Kraag op v≈0.72–0.78 (nét in de bovenkap) en onderzoom op v≈0.28.
    g.fillStyle = 'rgba(20,22,28,0.85)';
    g.fillRect(0, 112, 512, 30);
    g.fillRect(0, 358, 512, 18);

    // Ritslijn op de borst (u=0.25 → x=128).
    g.fillStyle = 'rgba(20,22,28,0.45)';
    g.fillRect(126, 142, 4, 190);

    // Sponsortekst op de borst, binnen u=0.25±0.12 en v 0.30–0.68.
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = kind === 'green' ? '#ffffff' : '#14161c';
    g.font = '900 44px "Arial Black", Arial, sans-serif';
    g.fillText('FIETS!', 128, 218, 116);
    g.font = '700 19px Arial, sans-serif';
    g.fillText('TEAM TERRY', 128, 256, 112);

    // Wit dossard-vlak met rugnummer (u≈0.75 → x≈384).
    g.fillStyle = '#f7f7f2';
    g.fillRect(340, 172, 88, 100);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 3;
    g.strokeRect(340, 172, 88, 100);
    g.fillStyle = '#111111';
    g.font = '900 64px "Arial Black", Arial, sans-serif';
    g.fillText(String(number), 384, 224, 74);
  });
}

// Gezicht op equirect-bol (u=0.25 kijkt +z → x=64). De features staan iets
// onder de evenaar zodat ze onder de helmrand uitkomen.
export function faceTexture(skinHex) {
  const skin = css(skinHex);
  return makeTex(`face:${skin}`, 256, 256, (g) => {
    g.fillStyle = skin;
    g.fillRect(0, 0, 256, 256);

    // Haarlijn in de nek (achterkant, u=0.75 → x=192), piept onder de helm uit.
    g.fillStyle = 'rgba(47,32,19,0.9)';
    g.beginPath();
    g.ellipse(192, 148, 70, 38, 0, 0, Math.PI * 2);
    g.fill();

    // Zachte schaduw richting hals/kin.
    const sh = g.createLinearGradient(0, 190, 0, 256);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = sh;
    g.fillRect(0, 190, 256, 66);

    for (const s of [-1, 1]) {
      const ex = 64 + 16 * s;
      // Oogwit + pupil + glimlichtje.
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(ex, 142, 7, 9, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1d1207';
      g.beginPath();
      g.arc(ex, 144, 3.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(ex - 1.5, 140.5, 1.4, 0, Math.PI * 2);
      g.fill();
      // Wenkbrauw.
      g.strokeStyle = 'rgba(40,24,8,0.9)';
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(ex, 136, 8, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    }

    // Mond.
    g.strokeStyle = '#79352b';
    g.lineWidth = 3.5;
    g.beginPath();
    g.arc(64, 166, 9, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();

    // Blosjes.
    g.fillStyle = 'rgba(226,104,84,0.25)';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(64 + 26 * s, 158, 7, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// Helm: basiskleur, spec-gradient op de kruin, racing-stripes op voor- en
// achtermeridiaan en langwerpige ventilatiegaten (canvas-verticaal = van
// voor naar achter over de helm).
export function helmetTexture(colorHex) {
  const col = css(colorHex);
  const light = luminance(colorHex) > 0.55;
  return makeTex(`helmet:${col}`, 256, 256, (g) => {
    g.fillStyle = col;
    g.fillRect(0, 0, 256, 256);

    const grad = g.createLinearGradient(0, 0, 0, 140);
    grad.addColorStop(0, 'rgba(255,255,255,0.30)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 140);

    g.fillStyle = light ? '#e02020' : 'rgba(255,255,255,0.85)';
    g.fillRect(60, 0, 8, 256);
    g.fillRect(188, 0, 8, 256);

    g.fillStyle = 'rgba(12,13,16,0.88)';
    const vents = [
      [34, 96], [54, 78], [74, 78], [94, 96], [44, 136], [84, 136], // voor
      [162, 96], [182, 80], [202, 80], [222, 96],                   // achter
    ];
    for (const [x, y] of vents) {
      g.beginPath();
      g.ellipse(x, y, 6, 20, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// Band-loopvlak voor de torus (u = om het wiel, herhaalt 30×; v = om de
// banddoorsnede: v≈0/1 = midden loopvlak, v≈0.25/0.75 = zijwanden).
export function tireTexture(type) {
  const mtb = type === 'mtb';
  return makeTex(`tire:${type}`, 128, 128, (g) => {
    g.fillStyle = mtb ? '#1c1d20' : '#232326';
    g.fillRect(0, 0, 128, 128);

    // Zijwandstroken + gumwall-lijntjes.
    g.fillStyle = mtb ? '#2b2d31' : '#3c3e42';
    g.fillRect(0, 24, 128, 16);
    g.fillRect(0, 88, 128, 16);
    g.fillStyle = 'rgba(150,116,82,0.55)';
    g.fillRect(0, 40, 128, 3);
    g.fillRect(0, 85, 128, 3);

    if (mtb) {
      // Versprongen noppenblokjes met licht randje op het loopvlak.
      for (const [y, off] of [[2, 0], [15, 16], [113, 16], [126, 0]]) {
        for (let x = 0; x < 128; x += 32) {
          g.fillStyle = '#2e3034';
          g.fillRect(x + off, y - 5, 14, 10);
          g.fillStyle = '#45484e';
          g.fillRect(x + off, y - 5, 14, 2.5);
        }
      }
    } else {
      // Fijn diagonaal file-profiel op de slick.
      g.strokeStyle = 'rgba(255,255,255,0.15)';
      g.lineWidth = 1.5;
      for (let x = -16; x < 136; x += 8) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + 16, 18);
        g.stroke();
        g.beginPath();
        g.moveTo(x, 128);
        g.lineTo(x + 16, 110);
        g.stroke();
      }
    }
  }, 30);
}

// Transparante tekst-decal voor de open cilinder-shells op de framebuizen.
// Tekst wordt 90° gedraaid getekend zodat hij langs de buis-as (v) loopt.
// flip=false: rotate(-π/2), leest van a naar b — voor de linkerkant.
// flip=true:  rotate(+π/2), leest van b naar a — voor de rechterkant.
// (Op de buitenkant van een cilinder spiegelt een texture nooit; alleen de
// leesrichting/glyf-oriëntatie verschilt per kant, vandaar twee varianten.)
export function frameDecalTexture(text, light, flip = false) {
  return makeTex(`decal:${text}:${light ? 1 : 0}:${flip ? 1 : 0}`, 256, 128, (g) => {
    g.clearRect(0, 0, 256, 128);
    g.translate(128, 64);
    g.rotate(flip ? Math.PI / 2 : -Math.PI / 2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // Groot font = glyf-hoogte om de buis; leesrichting wordt anamorf
    // gecomprimeerd tot een gestrekt "bike-brand" lettertype dat past.
    g.font = 'italic 900 110px "Arial Black", Arial, sans-serif';
    const w = g.measureText(text).width || 1;
    g.scale(Math.min(118 / w, 0.18), 1);
    g.lineJoin = 'round';
    g.lineWidth = 10;
    g.strokeStyle = light ? '#ffffff' : '#14161c';
    g.fillStyle = light ? '#14161c' : '#ffffff';
    g.strokeText(text, 0, 0);
    g.fillText(text, 0, 0);
  });
}

// Remschijf voor de cilinder-caps (cap-UV is planair-circulair).
export function discTexture() {
  return makeTex('disc', 128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, '#7d838c');
    grad.addColorStop(0.75, '#a7adb6');
    grad.addColorStop(1, '#5d626a');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);

    // 8 radiaal-sleuven in de spider.
    g.strokeStyle = 'rgba(28,30,34,0.75)';
    g.lineWidth = 4;
    g.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(64 + Math.cos(a) * 22, 64 + Math.sin(a) * 22);
      g.lineTo(64 + Math.cos(a + 0.5) * 38, 64 + Math.sin(a + 0.5) * 38);
      g.stroke();
    }
    // Ring van 12 koelgaatjes in het remvlak.
    g.fillStyle = 'rgba(24,26,30,0.9)';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.arc(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46, 4, 0, Math.PI * 2);
      g.fill();
    }
    // Naaf.
    g.fillStyle = '#4a4e55';
    g.beginPath();
    g.arc(64, 64, 14, 0, Math.PI * 2);
    g.fill();
  });
}

// Witte sok met twee accentstrepen; wikkelt één keer om het sok-cilindertje.
export function sockTexture(accentHex) {
  const acc = css(accentHex);
  return makeTex(`sock:${acc}`, 64, 64, (g) => {
    g.fillStyle = '#f4f4f4';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = acc;
    g.fillRect(0, 18, 64, 8);
    g.fillRect(0, 34, 64, 8);
  });
}
