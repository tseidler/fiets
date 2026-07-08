import { defineConfig } from 'vite';

// Relatieve paden zodat de dist/-map op elke statische host werkt,
// ook in een submap (bijv. GitHub Pages op /fiets/).
export default defineConfig({
  base: './',
});
