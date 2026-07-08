// Speelbare karakters — elk met een Tour de France-trui en eigen stats.
// mods: vermenigvuldigers op topsnelheid, trapkracht en sprongkracht.
export const CHARACTERS = [
  {
    id: 'jef',
    name: 'Jef',
    title: 'De Kapitein',
    jersey: 'yellow',
    desc: 'Rijdt al jaren vooraan in het peloton. Solide in alles — de gele trui zit hem gegoten.',
    mods: { top: 1.0, power: 1.0, jump: 1.0 },
    skin: 0xe0ac69,
    helmet: 0xffd600,
    stats: { Snelheid: 3, Kracht: 3, Sprong: 3 },
    previewBike: 'jaune',
  },
  {
    id: 'pien',
    name: 'Pien',
    title: 'De Klimgeit',
    jersey: 'polka',
    desc: 'Danst op de pedalen en vliegt over elk obstakel. Bergkoningin in de bolletjestrui.',
    mods: { top: 0.97, power: 1.02, jump: 1.18 },
    skin: 0xc68642,
    helmet: 0xffffff,
    stats: { Snelheid: 3, Kracht: 3, Sprong: 5 },
    previewBike: 'blanc',
  },
  {
    id: 'bram',
    name: 'Bram',
    title: 'De Sprinter',
    jersey: 'green',
    desc: 'Explosief als een TGV. In de groene trui trapt hij iedereen uit het wiel.',
    mods: { top: 1.03, power: 1.15, jump: 0.92 },
    skin: 0x8d5524,
    helmet: 0x27b04b,
    stats: { Snelheid: 4, Kracht: 5, Sprong: 2 },
    previewBike: 'forest',
  },
];

// 10 fietsen: 5 racefietsen + 5 mountainbikes.
// top = topsnelheid (m/s), power = snelheidswinst per pedaalslag,
// jump = sprongkracht-factor, paveGrip = snelheidsbehoud op kasseien (0..1).
export const BIKES = [
  {
    id: 'rosso', name: 'Rosso Corsa', type: 'race', color: 0xd62828,
    top: 17.6, power: 1.5, jump: 0.95, paveGrip: 0.45,
    stats: { Snelheid: 5, Kracht: 3, Sprong: 2 },
  },
  {
    id: 'noir', name: 'Carbone Noir', type: 'race', color: 0x23252c,
    top: 18.2, power: 1.38, jump: 0.92, paveGrip: 0.42,
    stats: { Snelheid: 5, Kracht: 2, Sprong: 1 },
  },
  {
    id: 'bleu', name: 'Équipe Bleu', type: 'race', color: 0x1e50c8,
    top: 17.2, power: 1.55, jump: 0.95, paveGrip: 0.45,
    stats: { Snelheid: 4, Kracht: 3, Sprong: 2 },
  },
  {
    id: 'blanc', name: 'Blanc Classique', type: 'race', color: 0xeceff4,
    top: 16.9, power: 1.6, jump: 1.0, paveGrip: 0.5,
    stats: { Snelheid: 4, Kracht: 4, Sprong: 2 },
  },
  {
    id: 'jaune', name: 'Maillot Machine', type: 'race', color: 0xffd600,
    top: 17.4, power: 1.5, jump: 0.95, paveGrip: 0.45,
    stats: { Snelheid: 5, Kracht: 3, Sprong: 2 },
  },
  {
    id: 'forest', name: 'Forest Fury', type: 'mtb', color: 0x2e7d32,
    top: 14.4, power: 1.78, jump: 1.3, paveGrip: 0.85,
    stats: { Snelheid: 3, Kracht: 4, Sprong: 4 },
  },
  {
    id: 'oranje', name: 'Oranje Boven', type: 'mtb', color: 0xf77f00,
    top: 14.9, power: 1.7, jump: 1.24, paveGrip: 0.85,
    stats: { Snelheid: 3, Kracht: 4, Sprong: 4 },
  },
  {
    id: 'peak', name: 'Purple Peak', type: 'mtb', color: 0x7b2cbf,
    top: 13.9, power: 1.85, jump: 1.36, paveGrip: 0.88,
    stats: { Snelheid: 2, Kracht: 5, Sprong: 5 },
  },
  {
    id: 'ice', name: 'Alpine Ice', type: 'mtb', color: 0x00b4d8,
    top: 15.3, power: 1.62, jump: 1.18, paveGrip: 0.82,
    stats: { Snelheid: 4, Kracht: 3, Sprong: 3 },
  },
  {
    id: 'rosa', name: 'Rosa Gravel', type: 'mtb', color: 0xf72585,
    top: 14.6, power: 1.74, jump: 1.28, paveGrip: 0.85,
    stats: { Snelheid: 3, Kracht: 4, Sprong: 4 },
  },
];

export const bikeById = (id) => BIKES.find((b) => b.id === id) ?? BIKES[0];
