import { octokit } from "./octokit";
import { isOnline } from "./is-online";
import { getUtcYearBounds, isDateInUtcYear } from "./commit-date";

interface CommitCountArgs {
  owner: string;
  repo: string;
}

export async function getCommitCount({ owner, repo }: CommitCountArgs, fallbackValue: number): Promise<number> {
  if (!await isOnline()) {
    return fallbackValue
  }

  const currentYear = new Date().getUTCFullYear();
  const {
    start: sinceDate,
    endInclusive: untilDate,
  } = getUtcYearBounds(currentYear);
  // GitHub's `until` bound is inclusive, so cap it one millisecond before
  // next year starts. The local filter below uses the exclusive boundary.

  try {
    const data = await octokit.paginate(octokit.rest.repos.listCommits, {
      owner,
      repo,
      since: sinceDate.toISOString(),
      until: untilDate.toISOString(),
      per_page: 100
    })

    const commitsThisYear = data.filter((commit: any) => {
      const commitDate = new Date(commit.commit.author.date);
      return isDateInUtcYear(commitDate, currentYear);
    });

    return commitsThisYear.length
  } catch (error) {
    console.error("Error fetching commit data:", error);
    return 0;
  }
}