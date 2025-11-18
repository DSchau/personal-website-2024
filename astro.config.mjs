import { defineConfig } from 'astro/config';
import { execSync } from "child_process";
import { readFileSync } from "fs";
import yaml from '@rollup/plugin-yaml';
import react from "@astrojs/react";
import rehypePrettyCode from "rehype-pretty-code";
import cloudflare from "@astrojs/cloudflare";
import FontToBuffer from 'unplugin-font-to-buffer/vite';
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";

const env = process.env.NODE_ENV;

// Plugin to handle .bin files as buffers
function binFilePlugin() {
  return {
    name: 'bin-file-loader',
    transform(code, id) {
      if (id.endsWith('.bin')) {
        const buffer = readFileSync(id);
        return {
          code: `export default new Uint8Array([${Array.from(buffer).join(',')}]).buffer`,
          map: null
        };
      }
    }
  };
}

function remarkModifiedTime() {
  return function (_, file) {
    const filepath = file.history[0];
    const result = execSync(`git log -1 --pretty="format:%cI" "${filepath}"`);
    file.data.astro.frontmatter.lastModified = result.toString();
  };
}

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  output: 'server',
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop'
    }
  },
  site: env === 'development' ? 'http://localhost:4321' : 'https://www.dustinschau.com',
  integrations: [react(), sitemap(), icon()],
  redirects: {
    '/uses': '/posts/uses',
    '/blog': '/posts',
    '/readme': '/posts/readme'
  },
  markdown: {
    syntaxHighlight: false,
    remarkPlugins: [remarkModifiedTime],
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
    plugins: [yaml(), FontToBuffer(), binFilePlugin()],
    ssr: {
      noExternal: ['@cloudflare/pages-plugin-vercel-og']
    }
  },
  adapter: cloudflare()
});