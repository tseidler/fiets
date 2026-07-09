// FIETS! — opstartpunt: renderer, menuflow en de game-loop.
import * as THREE from 'three';
import { CHARACTERS, BIKES, bikeById } from './data.js';
import { STAGES, drawProfile } from './stages.js';
import { buildRig } from './models.js';
import { Showroom } from './menus.js';
import { Race } from './game.js';
import { sfx } from './audio.js';

// Parcours-opties: index 0 = oneindig gegenereerd, daarna de vaste etappes.
const STAGE_OPTIONS = [null, ...STAGES];
const TYPE_LABELS = { vlak: 'VLAK', heuvel: 'HEUVELS', berg: 'BERGRIT' };

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);

const showroom = new Showroom(renderer);
let race = null;
let state = 'title'; // title | char | bike | stage | race | over

let charIdx = Math.min(CHARACTERS.length - 1, Number(localStorage.getItem('fiets.char') || 0));
let bikeIdx = Math.min(BIKES.length - 1, Number(localStorage.getItem('fiets.bike') || 0));
let stageIdx = Math.min(STAGE_OPTIONS.length - 1, Number(localStorage.getItem('fiets.stage') || 0));

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

function currentList() {
  return state === 'char' ? CHARACTERS : state === 'bike' ? BIKES : STAGE_OPTIONS;
}

function currentIdx() {
  return state === 'char' ? charIdx : state === 'bike' ? bikeIdx : stageIdx;
}

function setCurrentIdx(i) {
  if (state === 'char') charIdx = i;
  else if (state === 'bike') bikeIdx = i;
  else stageIdx = i;
}

function renderCards() {
  const cards = el('select-cards');
  cards.innerHTML = '';
  cards.classList.toggle('bikes', state === 'bike');
  cards.classList.toggle('stages', state === 'stage');
  const list = currentList();
  const selected = currentIdx();
  list.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'card' + (i === selected ? ' selected' : '');
    if (state === 'char') {
      card.innerHTML = `${jerseySwatch(item.jersey)}<h3>${item.name}</h3><div class="card-title">${item.title}</div><p>${item.desc}</p>${statBars(item.stats)}`;
    } else if (state === 'bike') {
      card.innerHTML = `${colorSwatch(item.color, item.type)}<h3>${item.name}</h3>${statBars(item.stats)}`;
    } else if (item === null) {
      // Willekeurig gegenereerd parcours (dobbelsteen).
      card.innerHTML = `<div class="stage-profile dice">🎲</div><h3>Willekeurig</h3><div class="card-title">Oneindig parcours</div><p class="stage-meta">Elke rit een uniek parcours — hoe ver kom jij?</p>`;
    } else {
      card.innerHTML =
        `<div class="stage-profile"><canvas width="196" height="60"></canvas></div>` +
        `<h3>${item.name}</h3><div class="card-title">${item.sub}</div>` +
        `<p class="stage-meta">${item.km} km · D+ ${item.dplus} m · <b class="stage-type ${item.type}">${TYPE_LABELS[item.type]}</b></p>`;
      drawProfile(card.querySelector('canvas'), item.profile);
    }
    card.addEventListener('click', () => {
      if (currentIdx() === i) { confirmSelect(); return; }
      setCurrentIdx(i);
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
  const bike = state === 'bike' || state === 'stage' ? BIKES[bikeIdx] : bikeById(char.previewBike);
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
  el('select-title').textContent =
    kind === 'char' ? 'KIES JE RENNER' : kind === 'bike' ? 'KIES JE FIETS' : 'KIES JE ETAPPE';
  renderCards();
  updateShowroom();
}

function fmtTime(t) {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}

function startRace() {
  localStorage.setItem('fiets.char', String(charIdx));
  localStorage.setItem('fiets.bike', String(bikeIdx));
  localStorage.setItem('fiets.stage', String(stageIdx));
  setScreen(null);
  state = 'race';
  race = new Race(renderer, CHARACTERS[charIdx], BIKES[bikeIdx], STAGE_OPTIONS[stageIdx], {
    onQuit() {
      race.dispose();
      race = null;
      showTitle();
    },
    onGameOver(stats) {
      state = 'over';
      const title = el('go-title');
      title.textContent = stats.won ? 'ETAPPE GEWONNEN !' : 'CHUTE FINALE !';
      title.classList.toggle('win', !!stats.won);
      el('go-stats').innerHTML =
        (stats.stageName ? `<div class="go-row"><span>Etappe</span><b>${stats.stageName}</b></div>` : '') +
        `<div class="go-row"><span>Afstand</span><b>${stats.distLabel}</b></div>` +
        (stats.stageName ? `<div class="go-row"><span>Tijd</span><b>${fmtTime(stats.time)}</b></div>` : '') +
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
  else if (state === 'bike') showSelect('stage');
  else if (state === 'stage') startRace();
}

window.addEventListener('keydown', (e) => {
  sfx.ensure();
  if (state === 'title') {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      sfx.confirm();
      showSelect('char');
    }
  } else if (state === 'char' || state === 'bike' || state === 'stage') {
    const list = currentList();
    let idx = currentIdx();
    if (e.code === 'ArrowRight' || e.code === 'ArrowDown') idx = (idx + 1) % list.length;
    else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') idx = (idx + list.length - 1) % list.length;
    else if (e.code === 'Enter') { confirmSelect(); return; }
    else if (e.code === 'Escape') {
      if (state === 'stage') showSelect('bike');
      else if (state === 'bike') showSelect('char');
      else showTitle();
      return;
    } else return;
    e.preventDefault();
    setCurrentIdx(idx);
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
