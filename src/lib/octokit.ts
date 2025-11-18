import { Octokit } from 'octokit'

// exclude the "throttling" plugin.
// see https://github.com/octokit/plugin-throttling.js/issues/794
Octokit.plugins = Octokit.plugins.filter((plugin) => plugin.name !== "throttling");

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN

export const octokit = new Octokit({
  auth: GITHUB_TOKEN
})

export const octokitAuth = (API_KEY?) => new Octokit({
  auth: GITHUB_TOKEN || API_KEY
})
