import { runPrompt } from "./ai";
import { z } from "zod";

type PullRequestSummaryPrompt = {
  prTitle: string;
  prDescription: string;
  commitMessages: string[];
  files: FileDiff[];
  diff: string;
};

export type PullRequestSummary = {
  title: string;
  description: string;
  files: {
    filename: string;
    summary: string;
    title: string;
  }[];
  type: string[];
};

export default async function runSummaryPrompt(
  pr: PullRequestSummaryPrompt
): Promise<PullRequestSummary> {
  let systemPrompt = `You are a helpful assistant that summarizes Git Pull Requests (PRs).`;

  systemPrompt += `Your task is to provide a full description for the PR content - title, type, description and affected file summaries.\n`;

  systemPrompt += `
- Keep in mind that the 'Original title', 'Original description' and 'Commit messages' sections may be partial, simplistic, non-informative or out of date. Hence, compare them to the PR diff code, and use them only as a reference.
- The generated title and description should prioritize the most significant changes.
- When quoting variables or names from the code, use backticks (\`).
- Return a summary for each single affected file or "no summary" if there is nothing to summarize.
\n`;

  let userPrompt = `
Summarize the following PR:

<Original PR Title>${pr.prTitle}</Original PR Title>
<Original PR Description>
${pr.prDescription}
</Original PR Description>
<Commit Messages>
${pr.commitMessages.join("\n")}
</Commit Messages>

<Affected Files>
${pr.files.map((file) => `- ${file.operation}: ${file.fileName}`).join("\n")}
</Affected Files>

<File Diffs>
${pr.diff}
</File Diffs>

Make sure each affected file is summarized and it's part of the returned JSON.
`;

  const fileSchema = z.object({
    filename: z.string().describe("The full file path of the relevant file"),
    summary: z
      .string()
      .describe(
        "Concise summary of the file changes in markdown format (max 70 words)"
      ),
    title: z
      .string()
      .describe(
        "An informative title for the changes in this file, describing its main theme (5-10 words)."
      ),
  });

  const schema = z.object({
    title: z
      .string()
      .describe(
        "Informative title of the PR, describing its main theme (10 words max)"
      ),
    description: z
      .string()
      .describe("Informative description of the PR, describing its main theme"),
    files: z
      .array(fileSchema)
      .describe(
        "List of files affected in the PR and summaries of their changes"
      ),
    type: z
      .array(z.enum(["BUG", "TESTS", "ENHANCEMENT", "DOCUMENTATION", "OTHER"]))
      .describe("One or more types that describe this PR's main theme."),
  });

  return (await runPrompt({
    prompt: userPrompt,
    systemPrompt,
    schema,
  })) as PullRequestSummary;
}
