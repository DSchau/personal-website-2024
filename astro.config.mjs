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

// Plugin to handle font and .bin files as ArrayBuffers (Cloudflare-compatible)
function arrayBufferPlugin() {
  return {
    name: 'arraybuffer-loader',
    transform(code, id) {
      if (id.endsWith('.bin') || id.endsWith('.ttf') || id.endsWith('.otf') || id.endsWith('.woff') || id.endsWith('.woff2')) {
        const buffer = readFileSync(id);
        const arr = Array.from(buffer);
        return {
          code: `export default new Uint8Array([${arr.join(',')}]).buffer`,
          map: null
        };
      }
    }
  };
}

// Dev only: Astro's dev image endpoint (/_image?href=…) has no content hash in
// its URL but is served with `max-age=31536000`, so edited images/SVGs stay
// stale in the browser. Make the browser revalidate instead (the ETag still
// gives cheap 304s when nothing changed). Production builds are unaffected:
// they emit content-hashed /_astro/ files.
function devImageNoCachePlugin() {
  return {
    name: 'dev-image-no-cache',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/_image')) {
          const setHeader = res.setHeader.bind(res);
          res.setHeader = (name, value) =>
            setHeader(name, name.toLowerCase() === 'cache-control' ? 'no-cache' : value);
        }
        next();
      });
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
  build: {
    // inline page CSS so it doesn't block rendering behind extra requests (it's small)
    inlineStylesheets: 'always',
  },
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
    plugins: [yaml(), arrayBufferPlugin(), devImageNoCachePlugin()],
    ssr: {
      noExternal: ['@cloudflare/pages-plugin-vercel-og']
    }
  },
  adapter: cloudflare()
});