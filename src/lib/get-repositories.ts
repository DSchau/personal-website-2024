import { octokit } from './octokit'

interface getRepositoriesArgs {
  owner?: string;
  limit: number;
}

export async function getRepositories({
  owner = 'dschau',
  limit = 6
}: getRepositoriesArgs) {
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

  return user.pinnedItems.nodes
  } catch (e) {
    console.error(e)

    return []
  }
}