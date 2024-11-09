import { info, warning } from "@actions/core";
import { Config } from "./config";
import { initOctokit } from "./octokit";
import { loadContext } from "./context";
import runSummaryPrompt from "./prompts";
import {
  buildLoadingMessage,
  buildWalkthroughMessage,
  OVERVIEW_MESSAGE_SIGNATURE,
} from "./messages";
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

  // Find or create overview comment with the summary
  const { data: comments } = await octokit.rest.issues.listComments({
    ...context.repo,
    issue_number: pull_request.number,
  });
  let overviewComment = comments.find((comment) =>
    comment.body?.includes(OVERVIEW_MESSAGE_SIGNATURE)
  );
  if (overviewComment) {
    await octokit.rest.issues.updateComment({
      ...context.repo,
      comment_id: overviewComment.id,
      body: buildLoadingMessage(commits, fileDiffs),
    });
    info(`updated existing overview comment`);
  } else {
    overviewComment = (
      await octokit.rest.issues.createComment({
        ...context.repo,
        issue_number: pull_request.number,
        body: buildLoadingMessage(commits, fileDiffs),
      })
    ).data;
    info(`posted new overview loading comment`);
  }

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

  // Update overview comment with the walkthrough
  await octokit.rest.issues.updateComment({
    ...context.repo,
    comment_id: overviewComment.id,
    body: buildWalkthroughMessage(summary),
  });
  info(`updated overview comment with walkthrough`);
}
