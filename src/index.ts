import * as core from '@actions/core';
import * as github from '@actions/github';
import { getPrDiff, postReviewComment } from './github';
import { reviewDiff } from './openrouter';

interface ActionInputs {
  openrouterApiKey: string;
  githubToken: string;
  model: string;
  maxDiffChars: number;
  promptExtra: string;
}

function getInputs(): ActionInputs {
  const maxDiffCharsRaw = core.getInput('max-diff-chars') || '60000';
  const maxDiffChars = parseInt(maxDiffCharsRaw, 10);
  return {
    openrouterApiKey: core.getInput('openrouter-api-key', { required: true }),
    githubToken: core.getInput('github-token', { required: true }),
    model: core.getInput('model') || 'tencent/hy3:free',
    maxDiffChars: Number.isFinite(maxDiffChars) ? maxDiffChars : 60000,
    promptExtra: core.getInput('prompt-extra'),
  };
}

async function run(): Promise<void> {
  const inputs = getInputs();
  const octokit = github.getOctokit(inputs.githubToken);
  const ctx = github.context;

  const pr = ctx.payload.pull_request;
  if (!pr) {
    core.info(
      'No pull_request found in event payload — skipping (this action only reviews PRs).',
    );
    return;
  }
  const pullNumber = pr.number;
  const { owner, repo } = ctx.repo;

  core.info(`Fetching diff for ${owner}/${repo}#${pullNumber}...`);
  const diff = await getPrDiff(octokit, owner, repo, pullNumber);
  core.info(`Diff length: ${diff.length} chars`);

  core.info(`Requesting review from model "${inputs.model}" via OpenRouter...`);
  const review = await reviewDiff({
    apiKey: inputs.openrouterApiKey,
    model: inputs.model,
    diff,
    maxDiffChars: inputs.maxDiffChars,
    promptExtra: inputs.promptExtra,
  });

  await postReviewComment(octokit, owner, repo, pullNumber, review.summary);
  core.info('Review comment posted.');
}

if (require.main === module) {
  run().catch((err: unknown) => {
    core.setFailed(err instanceof Error ? err.message : String(err));
  });
}

export { run };
