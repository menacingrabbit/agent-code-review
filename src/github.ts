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
 * Post a NEW review comment on a pull request. Every action run creates a fresh
 * comment rather than editing the previous one, so the full review history of the
 * PR is preserved. The previous review is still passed as context (via
 * findPreviousReviewComment in index.ts) so the model can acknowledge fixes
 * without repeating already-raised findings.
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
