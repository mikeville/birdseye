import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (globalThis as any).process?.env ?? {};
const explicitPort = env.PORT ? Number(env.PORT) : undefined;

// Default to 5180 (matches .claude/launch.json) instead of Vite's 5173 so
// birdseye doesn't fight other prototypes already on 5173. With strictPort
// off, Vite still auto-increments if 5180 is taken. PORT env var pins.
export default defineConfig({
  // Relative asset paths so the same build works whether served from the site
  // root (despin.netlify.app/) or behind a subpath proxy (mikemake.com/despin/).
  base: './',
  plugins: [react()],
  server: {
    host: true,
    ...(explicitPort
      ? { port: explicitPort, strictPort: true }
      : { port: 5180, strictPort: false }),
  },
});
