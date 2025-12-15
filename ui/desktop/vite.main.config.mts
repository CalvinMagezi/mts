import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // node-pty is a native module - keep it external so Vite doesn't try to bundle it
      // It will be loaded from node_modules at runtime
      external: ['node-pty'],
    },
  },
});
