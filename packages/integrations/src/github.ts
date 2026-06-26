import type { ActivityItem } from "@mark-1/shared";

export type GitHubPullRequest = {
  id: number;
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  repository: string;
  author: string;
  draft: boolean;
  createdAt: string;
  updatedAt: string;
};

type GitHubUser = { login: string };
type GitHubSearchIssue = {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  draft?: boolean;
  user?: { login?: string };
  repository_url: string;
  created_at: string;
  updated_at: string;
};

type GitHubPull = {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  draft?: boolean;
  user?: { login?: string };
  head?: { repo?: { full_name?: string } };
  base?: { repo?: { full_name?: string } };
  created_at: string;
  updated_at: string;
};

export async function fetchGitHubPullRequests(input: { token?: string; repositories?: string[]; limit?: number } = {}) {
  const token = input.token ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required");

  const limit = input.limit ?? 20;
  const repositories = input.repositories ?? parseRepositories(process.env.GITHUB_REPOSITORIES);

  if (repositories.length > 0) {
    const pulls = await Promise.all(repositories.map((repo) => githubFetch<GitHubPull[]>(`/repos/${repo}/pulls?state=open&per_page=${Math.min(limit, 30)}`, token)));
    return pulls.flat().map(toPullRequestFromPull).slice(0, limit);
  }

  const user = await githubFetch<GitHubUser>("/user", token);
  const query = encodeURIComponent(`type:pr state:open author:${user.login} archived:false`);
  const result = await githubFetch<{ items: GitHubSearchIssue[] }>(`/search/issues?q=${query}&sort=updated&order=desc&per_page=${limit}`, token);
  return result.items.map(toPullRequestFromSearchIssue);
}

export function normalizeGitHubPullRequest(pr: GitHubPullRequest): Omit<ActivityItem, "id" | "createdAt" | "updatedAt"> {
  return {
    source: "github",
    sourceId: `github_pr_${pr.id}`,
    type: "pull_request",
    title: `${pr.repository}#${pr.number}: ${pr.title}`,
    body: `${pr.author} opened/updated ${pr.draft ? "draft " : ""}PR #${pr.number}.`,
    actorName: pr.author,
    url: pr.htmlUrl,
    priority: pr.draft ? "low" : "normal",
    status: "unread",
    metadata: {
      repository: pr.repository,
      number: pr.number,
      state: pr.state,
      draft: pr.draft,
      updatedAt: pr.updatedAt
    }
  };
}

function parseRepositories(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((repo) => repo.trim())
    .filter(Boolean);
}

async function githubFetch<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "mark-1"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function toPullRequestFromSearchIssue(issue: GitHubSearchIssue): GitHubPullRequest {
  const repository = issue.repository_url.split("/repos/")[1] ?? "unknown/repo";
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    state: issue.state,
    htmlUrl: issue.html_url,
    repository,
    author: issue.user?.login ?? "GitHub",
    draft: Boolean(issue.draft),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at
  };
}

function toPullRequestFromPull(pull: GitHubPull): GitHubPullRequest {
  return {
    id: pull.id,
    number: pull.number,
    title: pull.title,
    state: pull.state,
    htmlUrl: pull.html_url,
    repository: pull.base?.repo?.full_name ?? pull.head?.repo?.full_name ?? "unknown/repo",
    author: pull.user?.login ?? "GitHub",
    draft: Boolean(pull.draft),
    createdAt: pull.created_at,
    updatedAt: pull.updated_at
  };
}
