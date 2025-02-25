import { context } from "@actions/github";
import { FileDiff } from "./diff";
import { PullRequestSummary } from "./prompts";

export const OVERVIEW_MESSAGE_SIGNATURE =
  "\n<!-- presubmit.ai: overview message -->";

export const PAYLOAD_TAG_OPEN = "\n<!-- presubmit.ai: payload --";
export const PAYLOAD_TAG_CLOSE = "\n-- presubmit.ai: payload -->";

const PRESUBMIT_SIGNATURE = "--- \n_autogenerated by presubmit.ai_";

export function buildLoadingMessage(
  baseCommit: string,
  commits: {
    sha: string;
    commit: {
      message: string;
    };
  }[],
  fileDiffs: FileDiff[]
): string {
  const { owner, repo } = context.repo;

  let message = `⏳ **Analyzing changes in this PR...** ⏳\n\n`;
  message += `_This might take a few minutes, please wait_\n\n`;

  // Group files by operation
  message += `<details>\n<summary>📥 Commits</summary>\n\n`;
  message += `Analyzing changes from base (\`${baseCommit.slice(
    0,
    7
  )}\`) to latest commit (\`${commits[commits.length - 1].sha.slice(
    0,
    7
  )}\`):\n`;

  for (const commit of commits.reverse()) {
    message += `- [${commit.sha.slice(
      0,
      7
    )}](https://github.com/${owner}/${repo}/commit/${commit.sha}): ${
      commit.commit.message
    }\n`;
  }

  message += "\n\n</details>\n\n";

  message += `<details>\n<summary>📁 Files being considered (${fileDiffs.length})</summary>\n\n`;
  for (const diff of fileDiffs) {
    let prefix = "🔄"; // Modified
    if (diff.status === "added") prefix = "➕";
    if (diff.status === "removed") prefix = "➖";
    if (diff.status === "renamed") prefix = "📝";

    let fileText = `${prefix} ${diff.filename}`;
    if (diff.status === "renamed") {
      fileText += ` (from ${diff.previous_filename})`;
    }
    fileText += ` _(${diff.hunks.length} ${
      diff.hunks.length === 1 ? "hunk" : "hunks"
    })_`;
    message += `${fileText}\n`;
  }
  message += "\n</details>\n\n";

  message += PRESUBMIT_SIGNATURE;
  message += OVERVIEW_MESSAGE_SIGNATURE;

  return message;
}

export function buildWalkthroughMessage(
  summary: PullRequestSummary,
  commits: string[]
): string {
  let message = `# 📖 Walkthrough\n\n`;

  // Add description with proper spacing
  message += `${summary.description.trim()}\n\n`;

  message += `## Changes\n\n`;

  // Create table with proper column alignment and escaping
  message += `| File | Summary |\n`;
  message += `|:----------|:---------------|\n`; // Left-align columns

  for (const file of summary.files) {
    // Escape pipes and wrap paths in backticks for better formatting
    const escapedPath = file.filename.replace(/\|/g, "\\|");
    const escapedSummary = file.summary.replace(/\|/g, "\\|");

    message += `| \`${escapedPath}\` | ${escapedSummary} |\n`;
  }

  const payload = {
    commits: commits,
  };

  message += PRESUBMIT_SIGNATURE;
  message += OVERVIEW_MESSAGE_SIGNATURE;
  message += PAYLOAD_TAG_OPEN;
  message += JSON.stringify(payload);
  message += PAYLOAD_TAG_CLOSE;

  return message;
}
