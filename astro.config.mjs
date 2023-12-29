import { defineConfig } from 'astro/config';
import yaml from '@rollup/plugin-yaml';
import react from "@astrojs/react";
import rehypePrettyCode from "rehype-pretty-code";

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  output: 'hybrid',
  integrations: [react()],
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
  }
});