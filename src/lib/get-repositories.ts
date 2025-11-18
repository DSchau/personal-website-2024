import { octokit } from './octokit'
import { isOnline } from './is-online';

interface getRepositoriesArgs {
  owner?: string;
  limit: number;
}

export async function getRepositories({
  owner = 'dschau',
  limit = 6
}: getRepositoriesArgs, fallbackValue: any[] = []) {

  if (!await isOnline()) {
    return fallbackValue
  }
  try {
    const { user, rateLimit } = await octokit.graphql(`
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

  console.log(rateLimit)

  const repos = user.pinnedItems.nodes
  return repos
  } catch (e) {
    console.error(e)
    return []
  }
}