import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config
export default defineConfig({
  define: {
    // This replaces process.env.ALPHA with a literal at build time
    'process.env.ALPHA': JSON.stringify(process.env.ALPHA === 'true'),
    'process.env.MTS_TUNNEL': JSON.stringify(process.env.MTS_TUNNEL !== 'no' && process.env.MTS_TUNNEL !== 'none'),
  },

  plugins: [tailwindcss()],

  build: {
    target: 'esnext'
  },
});
