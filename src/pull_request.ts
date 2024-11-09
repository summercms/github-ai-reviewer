import { info, warning } from "@actions/core";
import { Config } from "./config";
import { initOctokit } from "./octokit";
import { loadContext } from "./context";
import runSummaryPrompt, { AIComment, runReviewPrompt } from "./prompts";
import {
  buildLoadingMessage,
  buildWalkthroughMessage,
  OVERVIEW_MESSAGE_SIGNATURE,
} from "./messages";
import { parseFileDiff } from "./diff";
import { Octokit } from "@octokit/action";
import { Context } from "@actions/github/lib/context";

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

  // Review PR code changes
  const review = await runReviewPrompt({
    files: fileDiffs,
    prTitle: pull_request.title,
    prDescription: pull_request.body || "",
    prSummary: summary.description,
  });
  info(`reviewed pull request`);

  // Post review comments
  await submitReview(
    octokit,
    context,
    {
      number: pull_request.number,
      headSha: pull_request.head.sha,
    },
    review.comments
  );
  info(`posted review comments`);
}

async function submitReview(
  octokit: Octokit,
  context: Context,
  pull_request: {
    number: number;
    headSha: string;
  },
  comments: AIComment[]
) {
  const submitInlineComment = async (
    file: string,
    line: number,
    content: string
  ) => {
    await octokit.pulls.createReviewComment({
      ...context.repo,
      pull_number: pull_request.number,
      commit_id: pull_request.headSha,
      path: file,
      body: content,
      line,
    });
  };

  // Handle file comments
  const fileComments = comments.filter((c) => !c.end_line);
  if (fileComments.length > 0) {
    const responses = await Promise.allSettled(
      fileComments.map((c) => submitInlineComment(c.file, -1, c.content))
    );

    for (const response of responses) {
      if (response.status === "rejected") {
        warning(`error creating file comment: ${response.reason}`);
      }
    }
  }

  // Handle line comments
  const lineComments = comments.filter((c) => !!c.end_line);

  // Try to submit all comments at once
  try {
    let commentsData = lineComments.map((c) => ({
      path: c.file,
      body: c.content,
      line: c.end_line,
      side: "RIGHT",
      start_line:
        c.start_line && c.start_line < c.end_line ? c.start_line : undefined,
      start_side:
        c.start_line && c.start_line < c.end_line ? "RIGHT" : undefined,
    }));

    const review = await octokit.pulls.createReview({
      ...context.repo,
      pull_number: pull_request.number,
      commit_id: pull_request.headSha,
      comments: commentsData,
    });

    await octokit.pulls.submitReview({
      ...context.repo,
      pull_number: pull_request.number,
      review_id: review.data.id,
      event: "COMMENT",
      body: "Review submitted",
    });
  } catch (error) {
    warning(`error submitting review: ${error}`);

    // If submitting all comments at once fails, try submitting them one by one
    info("trying to submit comments one by one");
    await Promise.allSettled(
      lineComments.map((c) =>
        submitInlineComment(c.file, c.end_line, c.content)
      )
    );
  }
}
