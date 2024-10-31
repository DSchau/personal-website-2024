import { octokit } from "./octokit";
import { isOnline } from "./is-online";

interface CommitCountArgs {
  owner: string;
  repo: string;
}

export async function getMostRecentCommit({ owner, repo }: CommitCountArgs, fallbackValue: Date): Promise<string | undefined> {
  if (!await isOnline()) {
    return fallbackValue.toISOString()
  }
  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1, // Fetch only the most recent commit
    });

    return data.at(0)?.commit.author?.date
  } catch (error) {
    console.error("Error fetching commit data:", error);
    return undefined
  }
}