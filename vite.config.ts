/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const REPO_NAME = 'turbo-octo-fishstick';

export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/, so assets must be
  // requested with that prefix in production. Local dev and `vite preview`
  // still work at the root.
  base: process.env.GITHUB_PAGES ? `/${REPO_NAME}/` : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
