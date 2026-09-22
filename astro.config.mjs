import { defineConfig, envField } from "astro/config"
import { execSync } from "child_process";
import { readFileSync } from "fs";
import yaml from '@rollup/plugin-yaml';
import react from "@astrojs/react";
import rehypePrettyCode from "rehype-pretty-code";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";

const env = process.env.NODE_ENV;

// Plugin to handle font, PNG, and .bin files as ArrayBuffers (Cloudflare-compatible).
// Vite may append ?query to the module id; strip it before matching/reading.
// Base64 is much cheaper for the worker to parse than a decimal Uint8Array literal.
function arrayBufferPlugin() {
  return {
    name: 'arraybuffer-loader',
    transform(code, id) {
      const cleanId = id.split('?')[0];
      const isFontOrBin = /\.(bin|ttf|otf|woff2?)$/i.test(cleanId);
      const isOgFallback = /og-fallback\.png$/i.test(cleanId);
      if (isFontOrBin || isOgFallback) {
        const buffer = readFileSync(cleanId);
        const b64 = buffer.toString('base64');
        return {
          code: `const u8 = Uint8Array.from(atob(${JSON.stringify(b64)}), (c) => c.charCodeAt(0));\nexport default u8.buffer;`,
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
  env: {
    schema: {
      PUBLIC_SPAM_FIELD_VALUE: envField.string({ context: 'client', access: "public" }),
      GITHUB_TOKEN: envField.string({ context: "server", access: "secret" }),
      RESEND_API_KEY: envField.string({ context: "server", access: "secret" })
    },
    validateSecrets: true
  },
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
    plugins: [yaml(), arrayBufferPlugin()],
    ssr: {
      noExternal: ['@cloudflare/pages-plugin-vercel-og']
    }
  },
  adapter: cloudflare()
});