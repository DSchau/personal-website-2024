# dustinschau.com

Source for [www.dustinschau.com](https://www.dustinschau.com), Dustin Schau's personal website and blog. Built with [Astro 5](https://astro.build) and React, deployed to Cloudflare Pages.

## Getting started

Requires Node 22 (see `.nvmrc`).

```sh
cp .env.sample .env   # fill in the values below
npm install
npm run dev           # http://localhost:4321
```

| Command           | Action                                                     |
| :---------------- | :--------------------------------------------------------- |
| `npm run dev`     | Start the local dev server                                 |
| `npm run build`   | Run `astro check`, then build the production site to `dist/` |
| `npm run preview` | Preview the production build locally                       |
| `npm run astro`   | Run arbitrary Astro CLI commands                           |

`npm install` also runs `scripts/patch-cloudflare-adapter.mjs` as a postinstall step. It patches a bug in `@astrojs/cloudflare` 12.x where the wasm module loader tries to rewrite a client chunk that only exists under `dist/_astro/` and the build fails with `ENOENT`. The fix upstream requires Astro 6, so the patch stays until this project upgrades.

### Environment variables

Defined and validated in `astro.config.mjs` via Astro's typed `env.schema`.

| Variable                  | Scope  | Purpose                                                        |
| :------------------------ | :----- | :------------------------------------------------------------- |
| `GITHUB_TOKEN`            | server | Octokit access for pinned repos and commit stats in the footer |
| `RESEND_API_KEY`          | server | Sends contact form email through [Resend](https://resend.com)  |
| `PUBLIC_SPAM_FIELD_VALUE` | client | Honeypot value checked by the contact form                     |

`ARCJET_KEY` appears in `.env.sample` but is not currently read anywhere.

## Pages

| Route             | Rendering   | Notes                                                                                   |
| :---------------- | :---------- | :-------------------------------------------------------------------------------------- |
| `/`               | prerendered | Featured posts, pinned GitHub repos, currently reading (Goodreads), contact form        |
| `/posts`          | prerendered | Blog index, sorted by date. Drafts are hidden in production builds                      |
| `/posts/[slug]`   | prerendered | Individual posts from the `posts` content collection                                    |
| `/work`           | prerendered | Work history from `src/assets/work.yaml`, rendered with `marked`                        |
| `/favorites`      | prerendered | Favorite films, series, albums, songs, and games from YAML, plus books from Goodreads   |
| `/books`          | prerendered | Everything on the Goodreads "read" shelf, grouped by year, with a 3D hero and stats     |
| `/404`            | prerendered |                                                                                         |

Redirects: `/uses` → `/posts/uses`, `/blog` → `/posts`, `/readme` → `/posts/readme`.

## API and image routes

| Route                 | Rendering   | Notes                                                                                                                 |
| :-------------------- | :---------- | :-------------------------------------------------------------------------------------------------------------------- |
| `/api/og.png`         | runtime     | Open Graph card for posts. Takes `title` and `tags` query params, renders with satori via `@cloudflare/pages-plugin-vercel-og` and bundled Rockwell / SF Pro fonts |
| `/og/books.png`       | prerendered | OG card for `/books`. Baked at build time because rendering six covers per request exceeds the Worker CPU budget       |
| `/api/goodreads.json` | runtime     | JSON for a Goodreads shelf: `?shelf=read`, `currently-reading`, or `favorites`. Edge-cached for a day, browser for an hour |
| `/api/email`          | runtime     | Contact form handler. Validates MX records via Cloudflare DNS, checks Gravatar, flags disposable and role-based addresses, then sends via Resend |

## Content

Content collections are defined in `src/content/config.ts`.

- **posts** (`src/content/posts/`): Markdown posts, one folder per post with co-located images. Frontmatter supports `title`, `date`, `tags`, `excerpt`, `featured`, `featuredImage`, `canonicalLink`, and `draft`. A `lastModified` field is injected at build time by a remark plugin that shells out to `git log`.
- **favorites** (`src/content/favorites/index.yaml`): Categorized lists of films, series, albums, songs, and games. Each item has `key`, `title`, optional `subtitle`, `hyperlink`, and an optional local `image`. Books are not stored here; they come from Goodreads.

Site metadata, navigation, work history, and contact details live as YAML in `src/assets/` and are imported through `@rollup/plugin-yaml`.

### Goodreads integration

`src/lib/goodreads.ts` parses the public Goodreads RSS feeds for the `read`, `currently-reading`, and `favorites` shelves. It paginates the read shelf, retries around Goodreads' intermittent anti-bot responses, and caches parsed results at the Cloudflare edge for a day. Because the pages that consume it are prerendered, the data only refreshes on a new build.

`.github/scheduled-rebuild.yml.example` is a GitHub Actions workflow that POSTs to a Cloudflare Pages deploy hook on a schedule so the baked-in book data stays current. To enable it, move it to `.github/workflows/scheduled-rebuild.yml` and add a `CLOUDFLARE_DEPLOY_HOOK_URL` repo secret.

## Architecture notes

- **Rendering.** `output: 'server'` with the `@astrojs/cloudflare` adapter. Most pages opt into `prerender = true`; only the OG image, Goodreads JSON, and email routes run at request time.
- **UI.** Astro components for layout and mostly static sections, React islands (`@astrojs/react`) for interactive pieces such as navigation, the contact form, and the footer. Icons from `phosphor-react` and `astro-icon`.
- **Styling.** Plain CSS. Globals, typography, variables, and code theming in `src/styles/`, CSS Modules for component-scoped styles. No framework.
- **Fonts for OG images.** A custom Vite plugin in `astro.config.mjs` inlines `.ttf`, `.otf`, `.woff`, `.woff2`, and `.bin` files as `Uint8Array` buffers so they work inside a Cloudflare Worker.
- **Syntax highlighting.** `rehype-pretty-code` with the Dracula theme. Astro's built-in highlighter is disabled.
- **Images.** Astro's image service is set to `noop`. Responsive images use `@unpic/astro`, with hosted assets served from imgix.
- **GitHub data.** `src/lib/octokit.ts` creates an Octokit client with the throttling plugin removed for Cloudflare compatibility. Helpers fetch pinned repositories, total commit count, and the most recent commit date. `src/lib/is-online.ts` short-circuits these calls when developing offline.
- **Legacy service worker.** `public/sw.js` is a self-unregistering service worker that cleans up clients still running the old Gatsby-era offline plugin.

## Project structure

```text
.
├── .github/scheduled-rebuild.yml.example   # opt-in scheduled Cloudflare rebuild
├── astro.config.mjs                        # integrations, env schema, Vite/remark/rehype plugins
├── scripts/patch-cloudflare-adapter.mjs    # postinstall patch for @astrojs/cloudflare 12.x
├── public/                                 # favicon, robots.txt, legacy sw.js
└── src/
    ├── assets/          # YAML data (meta, navigation, work, contact), fonts, company logos
    ├── components/      # Astro + React components, one folder per component
    ├── content/         # posts (Markdown) and favorites (YAML) collections
    ├── layouts/         # Layout.astro (site shell + footer data), BlogPost.astro
    ├── lib/             # goodreads, octokit, GitHub helpers, is-online
    ├── pages/           # routes, API endpoints, OG image endpoints
    └── styles/          # global CSS
```
