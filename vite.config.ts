/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Deployed as a GitHub Pages *project* site at /mathmind/, so production assets
// are served from that base. Dev + tests stay at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mathmind/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
