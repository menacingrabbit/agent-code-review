export interface ReviewResult {
  summary: string;
}

export interface ReviewOptions {
  apiKey: string;
  model: string;
  diff: string;
  maxDiffChars: number;
  promptExtra: string;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are an experienced senior software engineer performing a code review of a pull request diff.
Your review should be constructive, specific, and actionable. Focus on:
- Correctness bugs and edge cases
- Security vulnerabilities
- Maintainability, clarity, and naming
- Tests and error handling
Do NOT comment on style nitpicks unless they affect correctness. Assume the reader is the PR author.
Match the language of the diff's surrounding code and PR for your prose; default to English.

Respond with ONLY a single valid JSON object of the form {"summary": "..."} where "summary" is your full review as Markdown. No extra text, no code fences around the JSON.`;

function buildUserPrompt(
  diff: string,
  maxDiffChars: number,
  promptExtra: string,
): string {
  let body = diff;
  if (body.length > maxDiffChars) {
    body =
      body.slice(0, maxDiffChars) +
      '\n\n...[diff truncated due to size limit]...';
  }

  let prompt = `Here is the pull request diff to review:\n\n\`\`\`diff\n${body}\n\`\`\``;
  const extra = promptExtra.trim();
  if (extra) {
    prompt += `\n\nAdditional reviewer instructions:\n${extra}`;
  }
  return prompt;
}

/**
 * Parse the model response into a ReviewResult.
 * `response_format: json_schema` is best-effort (some free models ignore it),
 * so we defensively strip stray code fences and fall back to the raw text if
 * JSON parsing fails.
 */
function parseReview(raw: string): ReviewResult {
  const trimmed = raw.trim();
  const fenced = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  try {
    const parsed = JSON.parse(fenced) as Partial<ReviewResult>;
    if (typeof parsed.summary === 'string' && parsed.summary.length > 0) {
      return { summary: parsed.summary };
    }
  } catch {
    // Model did not return valid JSON — use the raw text as the review.
  }
  return { summary: raw };
}

export async function reviewDiff(opts: ReviewOptions): Promise<ReviewResult> {
  const userContent = buildUserPrompt(opts.diff, opts.maxDiffChars, opts.promptExtra);

  const resp = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'review',
          strict: true,
          schema: {
            type: 'object',
            properties: { summary: { type: 'string' } },
            required: ['summary'],
          },
        },
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenRouter request failed (${resp.status}): ${text}`);
  }

  const json = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned no content.');
  }
  return parseReview(content);
}
