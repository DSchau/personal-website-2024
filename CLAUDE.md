# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start local dev server at `localhost:4321`
- `npm run build` - Type check with `astro check`, then build production site to `./dist/`
- `npm run preview` - Preview production build locally

### Deployment
This site is deployed to Cloudflare Pages using the `@astrojs/cloudflare` adapter in SSR mode (`output: 'server'`).

## Environment Variables

Required environment variables (see `.env.sample`):
- `GITHUB_TOKEN` - Used by GitHub API (Octokit) to fetch repository data (commit counts, recent commits) for the footer
- `RESEND_API_KEY` - Used for contact form email functionality via Resend
- `PUBLIC_SPAM_FIELD_VALUE` - Client-side spam prevention field

These are configured in `astro.config.mjs` under `env.schema` using Astro's typed environment system (`astro:env/server` and `astro:env/client`).

## Architecture

### Framework & Rendering
- **Astro 5** with SSR mode (`output: 'server'`) deployed to Cloudflare Pages
- Mix of **prerendered static pages** (blog posts) and **server-rendered pages** (OG images, contact form API)
- **React components** via `@astrojs/react` for interactive UI (navigation, forms, etc.)
- Path aliases configured with `@/*` pointing to `./src/*`

### Content Management
Uses **Astro Content Collections** (defined in `src/content/config.ts`):

1. **posts** collection (`type: 'content'`)
   - Blog posts stored in `src/content/posts/` as Markdown files
   - Schema includes: title, date, tags, excerpt, featured status, featuredImage, canonicalLink
   - `lastModified` field is automatically added by the `remarkModifiedTime` plugin (uses git log)
   - Accessed via `getCollection('posts')`

2. **favorites** collection (`type: 'data'`)
   - Data files in `src/content/favorites/`
   - Schema for categorized favorites: books, films, series, albums, songs, games
   - Each category contains items with: key, title, subtitle, hyperlink, image

### Dynamic Routes & APIs

**API Routes** (`src/pages/api/`):
- `/api/og.png.ts` - Dynamic OG image generation using `@cloudflare/pages-plugin-vercel-og`
  - Accepts `title` and `tags` query parameters
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
- `arrayBufferPlugin()` - Custom plugin to load font files (`.ttf`, `.otf`, `.woff`, `.woff2`) and `.bin` files as `Uint8Array` buffers for Cloudflare compatibility
- `@rollup/plugin-yaml` - Import YAML files (e.g., `assets/meta.yaml` for site metadata)

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
- Astro's image service is set to `'noop'` (no optimization) in config
- Uses `@unpic/astro` for responsive images
- Home page preconnects to `dschau-website.imgix.net` for performance

### Redirects
Configured in `astro.config.mjs`:
- `/uses` → `/posts/uses`
- `/blog` → `/posts`
- `/readme` → `/posts/readme`

## Important Notes

- The site uses a custom font loading strategy via the `arrayBufferPlugin()` to ensure fonts work with Cloudflare Pages
- OG images are generated at runtime with custom fonts, not prerendered
- Contact form has sophisticated email validation to prevent spam (MX records, Gravatar check, disposable email detection)
- Blog posts support both `date` and `lastModified` (from git) frontmatter fields
- The Octokit instance has the throttling plugin removed to avoid compatibility issues
