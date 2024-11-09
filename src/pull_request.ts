import { info, warning } from "@actions/core";
import { Config } from "./config";
import { initOctokit } from "./octokit";
import { loadContext } from "./context";
import runSummaryPrompt from "./prompts";
import { buildInitialMessage, buildWalkthroughMessage } from "./messages";
import { parseFileDiff } from "./diff";

export async function handlePullRequest(config: Config) {
  const context = await loadContext();
  if (
    context.eventName !== "pull_request" &&
    context.eventName !== "pull_request_target"
  ) {
    warning("unsupported github event");
    return;
  }

  const { pull_request } = context.payload;
  if (!pull_request) {
    warning("`pull_request` is missing from payload");
    return;
  }

  const octokit = initOctokit(config.githubToken);

  // Get modified files
  const { data: files } = await octokit.rest.pulls.listFiles({
    ...context.repo,
    pull_number: pull_request.number,
  });
  const fileDiffs = files.map(parseFileDiff);
  info(`successfully fetched file diffs`);

  // Get commit messages
  const { data: commits } = await octokit.rest.pulls.listCommits({
    ...context.repo,
    pull_number: pull_request.number,
  });
  info(`successfully fetched commit messages`);

  // Create initial comment with the summary
  const initialComment = await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: pull_request.number,
    body: buildInitialMessage(commits, fileDiffs),
  });
  info(`posted initial comment`);

  // Generate PR summary
  const summary = await runSummaryPrompt({
    prTitle: pull_request.title,
    prDescription: pull_request.body || "",
    commitMessages: commits.map((commit) => commit.commit.message),
    files: files,
  });
  info(`generated pull request summary: ${summary.title}`);

  // Update PR title and description
  await octokit.rest.pulls.update({
    ...context.repo,
    pull_number: pull_request.number,
    title: summary.title,
    body: summary.description,
  });
  info(`updated pull request title and description`);

  // Update initial comment with the walkthrough
  await octokit.rest.issues.updateComment({
    ...context.repo,
    comment_id: initialComment.data.id,
    body: buildWalkthroughMessage(summary),
  });
  info(`posted walkthrough`);
}
