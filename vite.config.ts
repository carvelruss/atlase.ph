import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        // Bootstrap 5.3 still ships @import-based SCSS; silence its deprecation noise.
        silenceDeprecations: ['import', 'color-functions', 'global-builtin'],
        quietDeps: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        // Group vendor code by what is actually bundled (avoids referencing
        // subpath-only meta-packages that have no root entry).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
            return 'vendor-charts';
          }
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-editor';
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('react-router') || id.includes('@remix-run')) return 'vendor-router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    // Frontend runs here with HMR; the API + Cloudflare bindings (D1/R2/KV) run in a
    // separate `wrangler pages dev` process on :8788. Proxy /api there so the browser
    // sees a single same-origin app (keeps session cookies / CSRF working in dev).
    // Target must be 127.0.0.1 (not `localhost`): on Windows `localhost` resolves to
    // IPv6 ::1 first, but wrangler binds IPv4 127.0.0.1 only, so the proxy would hang.
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.tsx'],
    css: false,
  },
});
