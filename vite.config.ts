import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repository under /jawed-website/.
// Cloudflare Pages and the custom domain serve from the domain root.
const base = process.env.GITHUB_ACTIONS === 'true' ? '/jawed-website/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
});
