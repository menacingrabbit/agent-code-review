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
export const REVIEW_MARKER = '<!-- agent-code-review -->';

/**
 * Find the most recent review comment posted by this action on a PR,
 * identified by the embedded REVIEW_MARKER. Returns its id and body, or null.
 */
export async function findPreviousReviewComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<{ id: number; body: string } | null> {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  for (const comment of [...comments].reverse()) {
    if (typeof comment.body === 'string' && comment.body.includes(REVIEW_MARKER)) {
      return { id: comment.id, body: comment.body };
    }
  }
  return null;
}

/**
 * Update the existing review comment if one was previously posted (identified by
 * REVIEW_MARKER), otherwise create a new one. Keeps a single evolving review on the
 * PR instead of piling up duplicate comments on every push.
 */
export async function upsertReviewComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  const prev = await findPreviousReviewComment(octokit, owner, repo, issueNumber);
  if (prev) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: prev.id,
      body,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
  }
}
