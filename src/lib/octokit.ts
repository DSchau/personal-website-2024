import { Octokit } from 'octokit'

// exclude the "throttling" plugin.
// see https://github.com/octokit/plugin-throttling.js/issues/794
Octokit.plugins = Octokit.plugins.filter((plugin) => plugin.name !== "throttling");

// In Astro with SSR, process.env is available server-side
// import.meta.env only works for PUBLIC_ prefixed vars
const githubToken = process.env.GITHUB_TOKEN;

if (!githubToken) {
  console.warn('⚠️  GITHUB_TOKEN not found in environment variables');
}

export const octokit = new Octokit({
  auth: githubToken
})
