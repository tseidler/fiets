// FIETS! — opstartpunt: renderer, menuflow en de game-loop.
import * as THREE from 'three';
import { CHARACTERS, BIKES, bikeById } from './data.js';
import { buildRig } from './models.js';
import { Showroom } from './menus.js';
import { Race } from './game.js';
import { sfx } from './audio.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);

const showroom = new Showroom();
let race = null;
let state = 'title'; // title | char | bike | race | over

let charIdx = Math.min(CHARACTERS.length - 1, Number(localStorage.getItem('fiets.char') || 0));
let bikeIdx = Math.min(BIKES.length - 1, Number(localStorage.getItem('fiets.bike') || 0));

const el = (id) => document.getElementById(id);
const screens = ['screen-title', 'screen-select', 'screen-gameover'];

function setScreen(id) {
  for (const s of screens) el(s).classList.toggle('hidden', s !== id);
}

function statBars(stats) {
  return Object.entries(stats)
    .map(([label, v]) =>
      `<div class="stat"><span class="stat-label">${label}</span><span class="dots">` +
      '<i class="on"></i>'.repeat(v) + '<i></i>'.repeat(5 - v) +
      '</span></div>'
    )
    .join('');
}

function jerseySwatch(kind) {
  return `<div class="swatch swatch-${kind}"></div>`;
}

function colorSwatch(color, type) {
  const hex = '#' + color.toString(16).padStart(6, '0');
  return `<div class="swatch" style="background:${hex}"><span class="type-badge ${type}">${type === 'race' ? 'RACE' : 'MTB'}</span></div>`;
}

function renderCards() {
  const cards = el('select-cards');
  cards.innerHTML = '';
  cards.classList.toggle('bikes', state === 'bike');
  const list = state === 'char' ? CHARACTERS : BIKES;
  const selected = state === 'char' ? charIdx : bikeIdx;
  list.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'card' + (i === selected ? ' selected' : '');
    if (state === 'char') {
      card.innerHTML = `${jerseySwatch(item.jersey)}<h3>${item.name}</h3><div class="card-title">${item.title}</div><p>${item.desc}</p>${statBars(item.stats)}`;
    } else {
      card.innerHTML = `${colorSwatch(item.color, item.type)}<h3>${item.name}</h3>${statBars(item.stats)}`;
    }
    card.addEventListener('click', () => {
      if ((state === 'char' ? charIdx : bikeIdx) === i) { confirmSelect(); return; }
      if (state === 'char') charIdx = i; else bikeIdx = i;
      sfx.ensure();
      sfx.select();
      renderCards();
      updateShowroom();
    });
    cards.appendChild(card);
  });
  const sel = cards.children[selected];
  if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function updateShowroom() {
  const char = CHARACTERS[charIdx];
  const bike = state === 'bike' ? BIKES[bikeIdx] : bikeById(char.previewBike);
  showroom.show(buildRig(char, bike));
}

function showTitle() {
  state = 'title';
  setScreen('screen-title');
  updateShowroom();
}

function showSelect(kind) {
  state = kind;
  setScreen('screen-select');
  el('select-title').textContent = kind === 'char' ? 'KIES JE RENNER' : 'KIES JE FIETS';
  renderCards();
  updateShowroom();
}

function startRace() {
  localStorage.setItem('fiets.char', String(charIdx));
  localStorage.setItem('fiets.bike', String(bikeIdx));
  setScreen(null);
  state = 'race';
  race = new Race(renderer, CHARACTERS[charIdx], BIKES[bikeIdx], {
    onQuit() {
      race.dispose();
      race = null;
      showTitle();
    },
    onGameOver(stats) {
      state = 'over';
      el('go-stats').innerHTML =
        `<div class="go-row"><span>Afstand</span><b>${(stats.dist / 1000).toFixed(2)} km</b></div>` +
        `<div class="go-row"><span>Obstakels overleefd</span><b>${stats.jumps}</b></div>` +
        `<div class="go-row"><span>Topsnelheid</span><b>${Math.round(stats.maxSpeed)} km/u</b></div>` +
        `<div class="go-row"><span>Record</span><b>${(stats.best / 1000).toFixed(2)} km${stats.newBest ? ' — NIEUW RECORD! 🏆' : ''}</b></div>` +
        `<div class="go-row"><span>Parcours</span><b>#${stats.seed.toString(36)}</b></div>`;
      setScreen('screen-gameover');
    },
  });
}

function confirmSelect() {
  sfx.ensure();
  sfx.confirm();
  if (state === 'char') showSelect('bike');
  else if (state === 'bike') startRace();
}

window.addEventListener('keydown', (e) => {
  sfx.ensure();
  if (state === 'title') {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      sfx.confirm();
      showSelect('char');
    }
  } else if (state === 'char' || state === 'bike') {
    const list = state === 'char' ? CHARACTERS : BIKES;
    let idx = state === 'char' ? charIdx : bikeIdx;
    if (e.code === 'ArrowRight' || e.code === 'ArrowDown') idx = (idx + 1) % list.length;
    else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') idx = (idx + list.length - 1) % list.length;
    else if (e.code === 'Enter') { confirmSelect(); return; }
    else if (e.code === 'Escape') {
      if (state === 'bike') showSelect('char'); else showTitle();
      return;
    } else return;
    e.preventDefault();
    if (state === 'char') charIdx = idx; else bikeIdx = idx;
    sfx.select();
    renderCards();
    updateShowroom();
  } else if (state === 'over') {
    if (e.code === 'Enter') {
      race.dispose();
      race = null;
      startRace();
    } else if (e.code === 'Escape') {
      race.dispose();
      race = null;
      showTitle();
    }
  }
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  const aspect = window.innerWidth / window.innerHeight;
  showroom.resize(aspect);
  if (race) race.resize(aspect);
});

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (race) {
    race.update(dt);
    if (race) race.render(renderer); // race kan in update() zijn beëindigd
  } else {
    showroom.update(dt);
    showroom.render(renderer);
  }
}

showTitle();
loop();
