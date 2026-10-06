# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start local dev server at `localhost:4321`
- `npm run build` - Type check with `astro check`, then build production site to `./dist/`
- `npm run preview` - Preview the production build locally in Cloudflare's `workerd` runtime (run `npm run build` first)

Both `astro dev` and `astro preview` run on-demand routes in `workerd` (via the Cloudflare Vite plugin), not Node. Local state lives in `.wrangler/` and preview secrets are copied from `.env` into `dist/server/.dev.vars` (both git-ignored).

### Deployment
This site is deployed to **Cloudflare Workers** (static assets + a Worker) using the `@astrojs/cloudflare` adapter in SSR mode (`output: 'server'`). The build writes static files to `dist/client/` and the Worker to `dist/server/`, along with a generated `dist/server/wrangler.json` (derived from the root `wrangler.jsonc`). Adapter v13+ no longer targets Cloudflare Pages.

The `/favorites` page is **prerendered** (`prerender = true`) and pulls books from Goodreads at build time. A daily GitHub Actions workflow (from `.github/scheduled-rebuild.yml.example`; move it to `.github/workflows/scheduled-rebuild.yml` to activate) triggers a rebuild so the baked-in Books and "Recently Read" sections refresh. It was written for a Cloudflare Pages deploy hook (`CLOUDFLARE_DEPLOY_HOOK_URL`) and needs updating for the Workers deployment.

## Environment Variables

Required environment variables (see `.env.sample`):
- `GITHUB_TOKEN` - Used by GitHub API (Octokit) to fetch repository data (commit counts, recent commits) for the footer
- `RESEND_API_KEY` - Used for contact form email functionality via Resend

These are configured in `astro.config.mjs` under `env.schema` using Astro's typed environment system (`astro:env/server` and `astro:env/client`).

## Architecture

### Framework & Rendering
- **Astro 7** with SSR mode (`output: 'server'`) deployed to Cloudflare Workers
- Mix of **prerendered static pages** (blog posts) and **server-rendered pages** (OG images, contact form API)
- Prerendering runs in Node (`prerenderEnvironment: 'node'`) so build-time env vars like `GITHUB_TOKEN` are visible to the prerendered footer
- **React components** via `@astrojs/react` for interactive UI (navigation, forms, etc.)
- Path aliases configured with `@/*` pointing to `./src/*`

### Content Management
Uses **Astro Content Collections** with the Content Layer API (defined in `src/content.config.ts`, using `glob()` loaders and `z` from `astro/zod`):

1. **posts** collection
   - Blog posts stored in `src/content/posts/` as Markdown files
   - The entry `id` is the URL slug: the directory/file name, or the `slug:` frontmatter field when set (several older posts use it). Render with `render(entry)` from `astro:content`
   - Schema includes: title, date, tags, excerpt, featured status, featuredImage, canonicalLink
   - `lastModified` field is automatically added by the `remarkModifiedTime` plugin (uses git log)
   - Accessed via `getCollection('posts')`

2. **favorites** collection (YAML data)
   - Data files in `src/content/favorites/`
   - Schema for categorized favorites: books, films, series, albums, songs, games
   - Each category contains items with: key, title, subtitle, hyperlink, image

### Dynamic Routes & APIs

**API Routes** (`src/pages/api/`):
- `/api/og.png.ts` - Dynamic OG image generation using `@cloudflare/pages-plugin-vercel-og`
  - Accepts `title`, `tags`, and `excerpt` query parameters (`type=books` redirects to the prerendered `/og/books.png`)
  - Uses custom fonts loaded as ArrayBuffers (Rockwell, SFPro) via custom Vite plugin
  - Set to `prerender: false` for runtime generation

- `/api/email.ts` - Contact form submission endpoint using Resend
  - Email validation with MX record checks, Gravatar verification, and disposable email detection
  - Uses Cloudflare DNS API for MX lookups
  - Sends formatted emails to website owner

**Dynamic Pages**:
- `/posts/[...slug].astro` - Individual blog post pages
  - Uses `getStaticPaths()` with `getCollection('posts')` for prerendering
  - Wrapped in `BlogPost.astro` layout

### Custom Plugins & Integrations

**Vite Plugins** (in `astro.config.mjs`):
- `arrayBufferPlugin()` - Custom plugin to load font files (`.ttf`, `.otf`, `.woff`, `.woff2`) and `.bin` files as `Uint8Array` buffers for Cloudflare compatibility. Uses the `load` hook because Vite 8's bundler reads modules as UTF-8 before transforms run
- `bundleVercelOgPlugin()` - Makes `@cloudflare/pages-plugin-vercel-og` (`.bin` font + `.wasm` imports) work in the Node prerender environment (for `/og/books.png`), and excludes it from dev dependency pre-bundling
- `clientNoProcessShimPlugin()` - Keeps the adapter's `globalThis.process` banner out of browser bundles
- `@rollup/plugin-yaml` - Import YAML files (e.g., `assets/meta.yaml` for site metadata)

**Integrations**:
- `pagesTrailingSlashRedirects()` - Emits `_redirects` rules so `/page` and `/page/index.html` 308 to `/page/`, matching the old Pages behaviour (Workers static assets would otherwise use a temporary 307)

**Markdown**: rendered with the `unified()` processor from `@astrojs/markdown-remark` (Astro 7's default, Sätteri, doesn't run remark/rehype plugins).

**Remark Plugin**:
- `remarkModifiedTime()` - Adds `lastModified` frontmatter field using `git log` for each post

**Rehype Configuration**:
- `rehype-pretty-code` with Dracula theme for syntax highlighting
- Custom visitors for empty lines and highlighted lines

### GitHub Integration
Uses Octokit (`src/lib/octokit.ts`) with modified plugin configuration (excludes throttling plugin):
- `getCommitCount()` - Fetches total commit count for repository stats
- `getMostRecentCommit()` - Gets last commit date for footer display
- Both called in `Layout.astro` to populate footer with repository metadata

### Styling
- Global CSS in `src/styles/` directory (globals.css, typography.css, variables.css, code.css)
- CSS Modules for component-specific styles (e.g., `work.module.css`)
- No CSS framework; custom CSS throughout

### Image Handling
- Images in content (e.g. post images) are optimized to webp at build time via the adapter's `imageService: 'compile'`; there's no runtime image transformation
- Uses `@unpic/astro` for responsive imgix images (its `astro` peer range is stale, so `package.json` has an `overrides` entry for it)
- Home page preconnects to `dschau-website.imgix.net` for performance

### Redirects
Configured in `astro.config.mjs`:
- `/uses` → `/posts/uses`
- `/blog` → `/posts`
- `/readme` → `/posts/readme`
- `/posts/2026-10-03-new-beginnings` → `/posts/2026-10-03-the-sameness-of-ai/`

The adapter writes both trailing-slash variants of each source path to `_redirects`.

## Important Notes

- The site uses a custom font loading strategy via the `arrayBufferPlugin()` to ensure fonts work in Cloudflare's runtime
- `compressHTML: true` keeps Astro's HTML-aware whitespace handling (Astro 7 defaults to JSX-style stripping, which removes spaces between inline elements)
- Endpoints with a file extension (e.g. `/api/og.png`) can't be requested with a trailing slash since Astro 6
- OG images are generated at runtime with custom fonts, not prerendered
- Contact form has sophisticated email validation to prevent spam (MX records, Gravatar check, disposable email detection)
- Blog posts support both `date` and `lastModified` (from git) frontmatter fields
- The Octokit instance has the throttling plugin removed to avoid compatibility issues
