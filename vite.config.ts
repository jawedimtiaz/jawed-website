import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project URLs live under /jawed-website/.
// Use that base only for a push build on main; pull-request browser tests,
// local development, and Cloudflare Pages builds must use the domain root.
const isGitHubPagesMainBuild =
  process.env.GITHUB_ACTIONS === 'true' &&
  process.env.GITHUB_EVENT_NAME === 'push' &&
  process.env.GITHUB_REF === 'refs/heads/main';

const base = isGitHubPagesMainBuild ? '/jawed-website/' : '/';

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
