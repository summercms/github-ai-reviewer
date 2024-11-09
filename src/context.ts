import { context, getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";

export async function loadContext(): Promise<Context> {
  if (process.env.DEBUG) {
    return await loadDebugContext();
  }
  return context;
}

async function loadDebugContext(): Promise<Context> {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is not set");
  }
  const octokit = getOctokit(process.env.GITHUB_TOKEN);

  const [owner, repo] = process.env.GITHUB_REPOSITORY?.split("/") || [];

  const { data: pull_request } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: parseInt(process.env.GITHUB_PULL_REQUEST || "1"),
  });

  return {
    ...context,
    eventName: process.env.GITHUB_EVENT_NAME || "",
    repo: {
      owner,
      repo,
    },
    payload: {
      pull_request: {
        ...pull_request,
        number: pull_request.number,
        html_url: pull_request.html_url,
        body: pull_request.body || undefined,
      },
    },
    issue: context.issue,
  };
}
