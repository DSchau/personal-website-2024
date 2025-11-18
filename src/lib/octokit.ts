import { Octokit } from 'octokit'

export const octokit = new Octokit({
  auth: import.meta.env.GITHUB_TOKEN,
  retry: {
    enabled: false  // Disable retries to avoid Cloudflare quota issues
  },
  request: {
    timeout: 10000  // 10 second timeout
  }
})
