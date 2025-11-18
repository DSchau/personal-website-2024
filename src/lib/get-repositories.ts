import { octokitAuth } from './octokit'
import { isOnline } from './is-online';

interface getRepositoriesArgs {
  owner?: string;
  limit: number;
  token?: string;
}

export async function getRepositories({
  owner = 'dschau',
  limit = 6,
  token
}: getRepositoriesArgs, fallbackValue: any[] = []) {

  if (!await isOnline()) {
    return fallbackValue
  }
  try {
    const { user, rateLimit } = await octokitAuth(token).graphql(`
    query GetPinnedRepos($owner: String!, $limit: Int!) {
      rateLimit {
        cost
        limit
        remaining
        used
        resetAt
      }
  
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

  return repos
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('GitHub API Error:', errorMessage);

    // Return fallback data
    return fallbackValue
  }
}