import * as github from '@actions/github';

type Octokit = ReturnType<typeof github.getOctokit>;

/**
 * Fetch the full raw diff of a pull request.
 * Uses the `application/vnd.github.v3.diff` media type so the whole diff is
 * returned as a single string, which is the most robust way to obtain it.
 */
export async function getPrDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string> {
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: 'diff' },
  });
  return typeof response.data === 'string'
    ? response.data
    : String(response.data);
}

/**
 * Post a comment on a pull request. PR comments are created through the
 * Issues API, using the PR number as the issue number.
 */
export async function postReviewComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}
