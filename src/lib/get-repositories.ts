import { octokit } from './octokit'
import { isOnline } from './is-online';

interface getRepositoriesArgs {
  owner?: string;
  limit: number;
}

// Cache to prevent excessive API calls
let cacheTimestamp: number | null = null;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Call tracking
let callCount = 0;
const callTimestamps: number[] = [];

export async function getRepositories({
  owner = 'dschau',
  limit = 6
}: getRepositoriesArgs, fallbackValue: any[] = []) {

  callCount++;
  callTimestamps.push(Date.now());

  console.log('=== getRepositories called ===');
  console.log(`Call #${callCount}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Owner: ${owner}, Limit: ${limit}`);
  console.log(`Stack trace:`, new Error().stack?.split('\n').slice(2, 5).join('\n'));

  if (callTimestamps.length > 1) {
    const timeSinceLastCall = callTimestamps[callTimestamps.length - 1] - callTimestamps[callTimestamps.length - 2];
    console.log(`Time since last call: ${timeSinceLastCall}ms`);
  }

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

  console.log('✓ GitHub API call successful');
  console.log('Rate limit info:', rateLimit);
  console.log(`Total calls to getRepositories: ${callCount}`);
  console.log('==============================\n');

  const repos = user.pinnedItems.nodes

  // Cache the results
  cacheTimestamp = Date.now();

  return repos
  } catch (e) {
    console.error(e)
    // Return cached data if available, even if expired
    return fallbackValue
  }
}