import { octokit } from "./octokit";

interface CommitCountArgs {
  owner: string;
  repo: string;
}

export async function getCommitCount({ owner, repo }: CommitCountArgs): Promise<number> {
  const currentYear = new Date().getFullYear();
  const sinceDate = new Date(`${currentYear}-01-01`);
  const untilDate = new Date(`${currentYear}-12-31`);

  try {
    const response = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since: sinceDate.toISOString(),
      until: untilDate.toISOString(),
    });

    const commitsThisYear = response.data.filter((commit: any) => {
      const commitDate = new Date(commit.commit.author.date);
      return commitDate >= sinceDate && commitDate <= untilDate;
    });

    return commitsThisYear.length;
  } catch (error) {
    console.error("Error fetching commit data:", error);
    return 0;
  }
}