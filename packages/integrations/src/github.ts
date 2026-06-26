import type { ActivityItem, ActivityPriority } from "@mark-1/shared";

export type GitHubPullRequestKind = "created" | "review_requested" | "mention" | "merged" | "failed_check";

export type GitHubPullRequest = {
  id: number;
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  repository: string;
  author: string;
  draft: boolean;
  kind: GitHubPullRequestKind;
  jiraKeys: string[];
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
    return pulls.flat().map((pull) => toPullRequestFromPull(pull, "created")).slice(0, limit);
  }

  const user = await githubFetch<GitHubUser>("/user", token);
  return searchGitHubPullRequests({ token, query: `type:pr state:open author:${user.login} archived:false`, kind: "created", limit });
}

export async function fetchGitHubPullRequestActivity(input: { token?: string; repositories?: string[]; limitPerKind?: number } = {}) {
  const token = input.token ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required");

  const user = await githubFetch<GitHubUser>("/user", token);
  const repoFilter = buildRepoFilter(input.repositories ?? parseRepositories(process.env.GITHUB_REPOSITORIES));
  const limit = input.limitPerKind ?? 10;
  const queries: Array<{ kind: GitHubPullRequestKind; query: string }> = [
    { kind: "created", query: `type:pr state:open author:${user.login} archived:false ${repoFilter}` },
    { kind: "review_requested", query: `type:pr state:open review-requested:${user.login} archived:false ${repoFilter}` },
    { kind: "mention", query: `type:pr state:open mentions:${user.login} archived:false ${repoFilter}` },
    { kind: "merged", query: `type:pr is:merged author:${user.login} archived:false ${repoFilter}` },
    { kind: "failed_check", query: `type:pr state:open author:${user.login} status:failure archived:false ${repoFilter}` }
  ];

  const groups = await Promise.all(queries.map(({ query, kind }) => searchGitHubPullRequests({ token, query, kind, limit }).catch(() => [])));
  const byKey = new Map<string, GitHubPullRequest>();

  for (const pr of groups.flat()) {
    const key = `${pr.repository}#${pr.number}:${pr.kind}`;
    byKey.set(key, pr);
  }

  return Array.from(byKey.values()).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function normalizeGitHubPullRequest(pr: GitHubPullRequest): Omit<ActivityItem, "id" | "createdAt" | "updatedAt"> {
  const priority = priorityForKind(pr.kind, pr.draft);
  const jiraSuffix = pr.jiraKeys.length > 0 ? ` Linked Jira: ${pr.jiraKeys.join(", ")}.` : "";
  return {
    source: "github",
    sourceId: `github_pr_${pr.kind}_${pr.id}`,
    type: `pull_request_${pr.kind}`,
    title: `${labelForKind(pr.kind)}: ${pr.repository}#${pr.number}`,
    body: `${pr.title} — ${pr.author} ${bodyVerbForKind(pr.kind)} ${pr.draft ? "draft " : ""}PR #${pr.number}.${jiraSuffix}`,
    actorName: pr.author,
    url: pr.htmlUrl,
    priority,
    status: "unread",
    metadata: {
      repository: pr.repository,
      number: pr.number,
      state: pr.state,
      draft: pr.draft,
      kind: pr.kind,
      jiraKeys: pr.jiraKeys,
      updatedAt: pr.updatedAt
    }
  };
}

export function parseJiraIssueKeys(value: string) {
  const matches = value.toUpperCase().match(/\b[A-Z][A-Z0-9]+-\d+\b/g) ?? [];
  return [...new Set(matches)];
}

function parseRepositories(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((repo) => repo.trim())
    .filter(Boolean);
}

async function searchGitHubPullRequests(input: { token: string; query: string; kind: GitHubPullRequestKind; limit: number }) {
  const query = encodeURIComponent(input.query.replace(/\s+/g, " ").trim());
  const result = await githubFetch<{ items: GitHubSearchIssue[] }>(`/search/issues?q=${query}&sort=updated&order=desc&per_page=${input.limit}`, input.token);
  return result.items.map((issue) => toPullRequestFromSearchIssue(issue, input.kind));
}

function buildRepoFilter(repositories: string[]) {
  return repositories.map((repo) => `repo:${repo}`).join(" ");
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

function toPullRequestFromSearchIssue(issue: GitHubSearchIssue, kind: GitHubPullRequestKind): GitHubPullRequest {
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
    kind,
    jiraKeys: parseJiraIssueKeys(issue.title),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at
  };
}

function toPullRequestFromPull(pull: GitHubPull, kind: GitHubPullRequestKind): GitHubPullRequest {
  return {
    id: pull.id,
    number: pull.number,
    title: pull.title,
    state: pull.state,
    htmlUrl: pull.html_url,
    repository: pull.base?.repo?.full_name ?? pull.head?.repo?.full_name ?? "unknown/repo",
    author: pull.user?.login ?? "GitHub",
    draft: Boolean(pull.draft),
    kind,
    jiraKeys: parseJiraIssueKeys(pull.title),
    createdAt: pull.created_at,
    updatedAt: pull.updated_at
  };
}

function priorityForKind(kind: GitHubPullRequestKind, draft: boolean): ActivityPriority {
  if (draft) return "low";
  if (kind === "review_requested" || kind === "mention" || kind === "failed_check") return "high";
  return "normal";
}

function labelForKind(kind: GitHubPullRequestKind) {
  switch (kind) {
    case "review_requested": return "Review requested";
    case "mention": return "Mention";
    case "merged": return "Merged PR";
    case "failed_check": return "Failed checks";
    case "created": return "Your PR";
  }
}

function bodyVerbForKind(kind: GitHubPullRequestKind) {
  switch (kind) {
    case "review_requested": return "requested your review on";
    case "mention": return "mentioned you in";
    case "merged": return "merged";
    case "failed_check": return "has failing checks on";
    case "created": return "opened/updated";
  }
}
