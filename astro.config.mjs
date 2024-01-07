import { defineConfig } from 'astro/config';
import yaml from '@rollup/plugin-yaml';
import react from "@astrojs/react";
import rehypePrettyCode from "rehype-pretty-code";
import cloudflare from "@astrojs/cloudflare";

import sitemap from "@astrojs/sitemap";

const env = process.env.NODE_ENV

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  output: 'hybrid',
  site: env === 'development' ? 'http://localhost:4321' : 'https://www.dustinschau.com',
  integrations: [react(), sitemap()],
  redirects: {
    '/uses': '/posts/uses',
    '/blog': '/posts',
    '/posts/about': '/posts/readme'
  },
  markdown: {
    syntaxHighlight: false,
    rehypePlugins: [[rehypePrettyCode, {
      theme: 'dracula',
      onVisitLine(node) {
        // Prevent lines from collapsing in `display: grid` mode, and
        // allow empty lines to be copy/pasted
        if (node.children.length === 0) {
          node.children = [{
            type: 'text',
            value: ' '
          }];
        }
      },
      onVisitHighlightedLine(node) {
        // Adding a class to the highlighted line
        node.properties?.className?.push('highlighted');
      }
    }]]
  },
  vite: {
    plugins: [yaml()]
  },
  adapter: cloudflare()
});