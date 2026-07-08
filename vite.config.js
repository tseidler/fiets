import { defineConfig } from 'vite';

// Relatieve paden zodat de build op elke statische host werkt,
// ook in een submap (bijv. GitHub Pages op /fiets/).
// Output naar docs/ zodat GitHub Pages er direct vanaf kan serveren
// (Settings → Pages → Deploy from a branch → /docs).
export default defineConfig({
  base: './',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
