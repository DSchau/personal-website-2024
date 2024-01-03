import { octokit } from "./octokit";

interface CommitCountArgs {
  owner: string;
  repo: string;
}

export async function getMostRecentCommit({ owner, repo }: CommitCountArgs): Promise<string | undefined> {
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