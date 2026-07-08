# FIETS! — Tour de Terry

Een 3D-fietsspel in Excitebike-stijl met Tour de France-sfeer. Gebouwd met Three.js.

## Starten

```bash
npm install
npm run dev
```

Open daarna http://localhost:5173 in Chrome.

## Besturing

| Toets | Actie |
|---|---|
| **R** / **U** (afwisselend) | Trappen — hoe sneller je afwisselt, hoe harder je gaat |
| **Spatie** | Springen over obstakels |
| **V** | Wissel camerastandpunt (veraf / dichtbij / zijkant) |
| **P** | Pauze |
| **Esc** | Terug naar menu |
| **← →** / **Enter** | Kiezen en bevestigen in de menu's |

## Spel

- Kies 1 van de 3 renners: **Jef** (gele trui, allrounder), **Pien** (bolletjestrui, springt het hoogst), **Bram** (groene trui, sprint het hardst).
- Kies 1 van de 10 fietsen: 5 racefietsen (sneller) en 5 mountainbikes (springen hoger en rijden beter over kasseien).
- Het parcours is oneindig. Ontwijk strobalen, boomstammen, hekken en pionnen door te springen; kasseienstroken (pavé) remmen je af — vooral op een racefiets.
- Je hebt 3 levens. Drie keer vallen ("Chute!") betekent einde rit. Je afstand is je score; het record wordt lokaal bewaard.

## Aanpassen

- Renners en fietsen (kleuren, stats): `src/data.js`
- Obstakels en moeilijkheid: `src/world.js` (`OB_DEFS` en de spawn-afstanden in `Obstacles.update`)
- Fysica (zwaartekracht, sprong, uitrollen): `src/game.js`
