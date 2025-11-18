import { octokit } from './octokit'
import { isOnline } from './is-online';

interface getRepositoriesArgs {
  owner?: string;
  limit: number;
}

// Cache to store the result during build time
let cachedRepos: any[] | null = null

export async function getRepositories({
  owner = 'dschau',
  limit = 6
}: getRepositoriesArgs, fallbackValue: any[] = []) {
  // Return cached value if available (prevents multiple API calls during build)
  if (cachedRepos !== null) {
    return cachedRepos
  }

  if (!await isOnline()) {
    return fallbackValue
  }
  try {
    const { user } = await octokit.graphql(`
    query GetPinnedRepos($owner: String!, $limit: Int!) {
      user(login: $owner) {
        pinnedItems(first: $limit, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
              createdAt
              description
              stargazers {
                totalCount
              }
              forks {
                totalCount
              }
              url
              homepageUrl
              repositoryTopics(first: 5) {
                nodes {
                    topic {
                        name
                    }
                }
              }
            }
          }
        }
      }
    }
  `, {
    owner,
    limit
  }) as any

  const repos = user.pinnedItems.nodes
  cachedRepos = repos // Cache the result for subsequent calls
  return repos
  } catch (e) {
    console.error(e)
    cachedRepos = [] // Cache empty array to prevent retry on error
    return []
  }
}