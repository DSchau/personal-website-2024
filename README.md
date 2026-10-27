# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/minimal)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/minimal/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🔑 Environment variables

`GITHUB_TOKEN` must be a fine-grained personal access token (not classic).

| Setting | Value |
| :------ | :---- |
| Repository access | `DSchau/personal-website-2024` |
| Contents | Read-only |
| Metadata | Read-only (required) |

## 📰 RSS feed

The site publishes an RSS 2.0 feed of all posts at [`/rss.xml`](https://www.dustinschau.com/rss.xml), newest first, and every page advertises it in its `<head>`. Posts with `draft: true` in their frontmatter are left out of the feed in every environment, including `npm run dev`. External posts link to their `canonicalLink`.

The feed logic lives in `src/lib/rss-feed.ts` and the route in `src/pages/rss.xml.ts`. Run its focused tests with:

```sh
npm test
```

They need Node 22 (see `.nvmrc`) and `python3`, and don't need `GITHUB_TOKEN` or `RESEND_API_KEY`.

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm test`                | Run the RSS feed tests                           |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
