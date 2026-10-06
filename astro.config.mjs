import { defineConfig, envField } from "astro/config"
import { execSync } from "child_process";
import { readFileSync } from "fs";
import yaml from '@rollup/plugin-yaml';
import react from "@astrojs/react";
import rehypePrettyCode from "rehype-pretty-code";
import cloudflare from "@astrojs/cloudflare";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";

const env = process.env.NODE_ENV;

// Plugin to handle font and .bin files as ArrayBuffers (Cloudflare-compatible).
// Runs in `load` (not `transform`): Vite 8's bundler reads modules as UTF-8
// before transforms run, which fails on binary files.
const BINARY_EXTS = ['.bin', '.ttf', '.otf', '.woff', '.woff2'];
function arrayBufferPlugin() {
  return {
    name: 'arraybuffer-loader',
    enforce: 'pre',
    load(rawId) {
      const id = rawId.split('?')[0];
      if (BINARY_EXTS.some((ext) => id.endsWith(ext))) {
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

// /og/books.png is prerendered in Node (prerenderEnvironment: 'node'), and
// @cloudflare/pages-plugin-vercel-og imports a `.bin` font and a `.wasm`
// module that Node can't import natively. In the prerender environment,
// bundle the package (so arrayBufferPlugin loads the `.bin`) and compile the
// `.wasm` from disk. In the workerd `ssr` environment the Cloudflare adapter
// bundles it and handles `.wasm` natively; only dev pre-bundling is skipped.
function bundleVercelOgPlugin() {
  return {
    name: 'prerender-vercel-og',
    // ahead of Vite's built-in wasm plugin, which would otherwise claim `.wasm`
    enforce: 'pre',
    configEnvironment(name) {
      if (name === 'prerender') {
        return { resolve: { noExternal: ['@cloudflare/pages-plugin-vercel-og'] } };
      }
      if (name === 'ssr') {
        // dev: the dep pre-bundler doesn't run arrayBufferPlugin and can't read
        // the `.bin` as text, so serve the package through the normal pipeline
        return { optimizeDeps: { exclude: ['@cloudflare/pages-plugin-vercel-og'] } };
      }
    },
    applyToEnvironment(environment) {
      return environment.name === 'prerender';
    },
    load(rawId) {
      const id = rawId.split('?')[0];
      if (id.endsWith('.wasm')) {
        return `import { readFileSync } from 'node:fs';\nexport default new WebAssembly.Module(readFileSync(${JSON.stringify(id)}));`;
      }
    }
  };
}

// The Cloudflare adapter adds a `globalThis.process` shim as a bundle banner
// for workerd, but sets it on the shared build config, so it also lands in
// every browser bundle (and inline script). Keep it out of the client.
function clientNoProcessShimPlugin() {
  return {
    name: 'client-no-process-shim',
    configEnvironment(name) {
      if (name === 'client') {
        return { build: { rolldownOptions: { output: { banner: '' } } } };
      }
    }
  };
}

// Cloudflare Pages normalised `/bio` and `/bio/index.html` to `/bio/` with a
// permanent 308. Workers static assets do the same with a *temporary* 307,
// which search engines treat differently. `_redirects` rules keep the status
// they're given and are checked before that normalisation, so emit a 308 rule
// for every prerendered page, after the Cloudflare adapter's own redirects.
function pagesTrailingSlashRedirects() {
  return {
    name: 'pages-trailing-slash-redirects',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const { readdir, readFile, appendFile } = await import('node:fs/promises');
        const { fileURLToPath } = await import('node:url');
        const root = fileURLToPath(dir);
        const pages = (await readdir(root, { recursive: true }))
          .map((f) => f.split('\\').join('/'))
          .filter((f) => f.endsWith('/index.html') && !f.startsWith('_astro/'))
          .map((f) => '/' + f.slice(0, -'index.html'.length))
          .sort();
        const rules = ['/index.html / 308'];
        for (const page of pages) {
          rules.push(`${page.slice(0, -1)} ${page} 308`, `${page}index.html ${page} 308`);
        }
        const file = new URL('./_redirects', dir);
        // the adapter's output has no trailing newline; don't glue onto its last rule
        const existing = await readFile(file, 'utf8').catch(() => '');
        const sep = existing && !existing.endsWith('\n') ? '\n' : '';
        await appendFile(file, sep + rules.join('\n') + '\n');
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
  // Astro 7 defaults to JSX-style whitespace stripping ('jsx'), which drops
  // the spaces between inline elements; keep the HTML-aware behaviour
  compressHTML: true,
  // sessions are unused; without this the Cloudflare adapter adds a SESSION
  // KV binding and wrangler provisions a KV namespace on deploy
  session: false,
  build: {
    // inline page CSS so it doesn't block rendering behind extra requests (it's small)
    inlineStylesheets: 'always',
  },
  env: {
    schema: {
      GITHUB_TOKEN: envField.string({ context: "server", access: "secret" }),
      RESEND_API_KEY: envField.string({ context: "server", access: "secret" })
    },
    validateSecrets: true
  },
  site: env === 'development' ? 'http://localhost:4321' : 'https://www.dustinschau.com',
  integrations: [react(), sitemap(), icon(), pagesTrailingSlashRedirects()],
  redirects: {
    '/uses': '/posts/uses',
    '/blog': '/posts',
    '/readme': '/posts/readme',
    // trailing slash on the target saves a hop (pages are served at `/slug/`);
    // the adapter emits both slash variants of the source
    '/posts/2026-10-03-new-beginnings': '/posts/2026-10-03-the-sameness-of-ai/'
  },
  markdown: {
    syntaxHighlight: false,
    // Astro 7 defaults to the Sätteri processor; stay on unified for the
    // remark/rehype plugins below
    processor: unified({
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
    }),
  },
  vite: {
    plugins: [yaml(), arrayBufferPlugin(), devImageNoCachePlugin(), bundleVercelOgPlugin(), clientNoProcessShimPlugin()],
  },
  adapter: cloudflare({
    // keep image optimisation at build time (the v13+ default,
    // 'cloudflare-binding', transforms through the Images binding at runtime)
    imageService: 'compile',
    // prerender in Node like Astro 5 did: workerd can't see build-time env
    // (.env / CI variables) that the prerendered footer needs (GITHUB_TOKEN)
    prerenderEnvironment: 'node',
  })
});