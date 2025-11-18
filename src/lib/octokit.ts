import { Octokit } from 'octokit'

// exclude the "throttling" plugin.
// see https://github.com/octokit/plugin-throttling.js/issues/794
Octokit.plugins = Octokit.plugins.filter((plugin) => plugin.name !== "throttling");

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN

const octokit = new Octokit({
  auth: GITHUB_TOKEN
})

const graphql = octokit.graphql.defaults({
  headers: {
    authorization: GITHUB_TOKEN,
  },
})

export { graphql, octokit }
