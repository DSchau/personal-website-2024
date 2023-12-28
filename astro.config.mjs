import { defineConfig } from 'astro/config';
import yaml from '@rollup/plugin-yaml';

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  integrations: [react()],
  vite: {
    plugins: [
      yaml()
    ]
  }
});