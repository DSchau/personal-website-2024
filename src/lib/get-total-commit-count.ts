import { octokit } from "./octokit";
import { isOnline } from "./is-online";

interface CommitCountArgs {
  owner: string;
  repo: string;
}

/**
 * Lifetime commit count on the default branch. Requests one commit per page and
 * reads the page number of the `last` link, so it's a single API call.
 */
export async function getTotalCommitCount({ owner, repo }: CommitCountArgs, fallbackValue: number): Promise<number> {
  if (!await isOnline()) {
    return fallbackValue
  }

  try {
    const { headers, data } = await octokit.rest.repos.listCommits({ owner, repo, per_page: 1 })
    const last = headers.link?.match(/[?&]page=(\d+)>;\s*rel="last"/)
    return last ? Number(last[1]) : data.length
  } catch (error) {
    console.error("Error fetching total commit count:", error);
    return fallbackValue
  }
}
