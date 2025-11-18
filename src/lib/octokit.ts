import { Octokit } from 'octokit'

// exclude the "throttling" plugin.
// see https://github.com/octokit/plugin-throttling.js/issues/794
Octokit.plugins = Octokit.plugins.filter((plugin) => plugin.name !== "throttling");

export const octokit = new Octokit({
  auth: import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN
})
