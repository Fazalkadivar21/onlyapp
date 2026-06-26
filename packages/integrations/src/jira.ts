import type { ActivityItem } from "@mark-1/shared";

export type JiraIssue = {
  id: string;
  key: string;
  summary: string;
  status: string;
  assignee?: string;
  priority?: string;
  url: string;
  updatedAt: string;
};

export type JiraSprint = {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
};

type JiraSprintResponse = { values?: Array<{ id: number; name: string; state: string; startDate?: string; endDate?: string }> };
type JiraSearchResponse = { issues?: JiraApiIssue[] };
type JiraApiIssue = {
  id: string;
  key: string;
  fields?: {
    summary?: string;
    status?: { name?: string };
    assignee?: { displayName?: string } | null;
    priority?: { name?: string } | null;
    updated?: string;
  };
};

export async function fetchJiraActiveSprintIssues(input: { siteUrl?: string; email?: string; apiToken?: string; boardId?: string; projectKey?: string; limit?: number } = {}) {
  const siteUrl = (input.siteUrl ?? process.env.JIRA_SITE_URL)?.replace(/\/$/, "");
  const email = input.email ?? process.env.JIRA_EMAIL;
  const apiToken = input.apiToken ?? process.env.JIRA_API_TOKEN;
  const boardId = input.boardId ?? process.env.JIRA_BOARD_ID;
  const projectKey = input.projectKey ?? process.env.JIRA_PROJECT_KEY;
  const limit = input.limit ?? 50;

  if (!siteUrl || !email || !apiToken) throw new Error("JIRA_SITE_URL, JIRA_EMAIL, and JIRA_API_TOKEN are required");

  const auth = btoa(`${email}:${apiToken}`);

  if (boardId) {
    const sprintResponse = await jiraFetch<JiraSprintResponse>(siteUrl, `/rest/agile/1.0/board/${boardId}/sprint?state=active`, auth);
    const sprint = sprintResponse.values?.[0] ? toSprint(sprintResponse.values[0]) : undefined;
    if (!sprint) return { sprint: undefined, issues: [] };

    const issueResponse = await jiraFetch<{ issues?: JiraApiIssue[] }>(siteUrl, `/rest/agile/1.0/sprint/${sprint.id}/issue?maxResults=${limit}`, auth);
    return { sprint, issues: (issueResponse.issues ?? []).map((issue) => toIssue(siteUrl, issue)) };
  }

  if (!projectKey) throw new Error("JIRA_BOARD_ID or JIRA_PROJECT_KEY is required");

  const jql = encodeURIComponent(`project = ${projectKey} AND assignee = currentUser() ORDER BY updated DESC`);
  const issueResponse = await jiraFetch<JiraSearchResponse>(siteUrl, `/rest/api/3/search/jql?jql=${jql}&maxResults=${limit}`, auth);
  return { sprint: undefined, issues: (issueResponse.issues ?? []).map((issue) => toIssue(siteUrl, issue)) };
}

export function normalizeJiraIssue(issue: JiraIssue): Omit<ActivityItem, "id" | "createdAt" | "updatedAt"> {
  const isBlocked = issue.status.toLowerCase().includes("block");
  const isHighPriority = ["highest", "high", "urgent", "critical"].includes((issue.priority ?? "").toLowerCase());

  return {
    source: "jira",
    sourceId: `jira_issue_${issue.id}`,
    type: isBlocked ? "issue_blocked" : "issue_update",
    title: `${issue.key}: ${issue.summary}`,
    body: `${issue.key} is ${issue.status}${issue.assignee ? ` and assigned to ${issue.assignee}` : ""}.`,
    actorName: "Jira",
    url: issue.url,
    priority: isBlocked ? "high" : isHighPriority ? "high" : "normal",
    status: "unread",
    metadata: {
      issueId: issue.id,
      key: issue.key,
      jiraStatus: issue.status,
      assignee: issue.assignee,
      priority: issue.priority,
      updatedAt: issue.updatedAt
    }
  };
}

async function jiraFetch<T>(siteUrl: string, path: string, auth: string): Promise<T> {
  const response = await fetch(`${siteUrl}${path}`, {
    headers: {
      accept: "application/json",
      authorization: `Basic ${auth}`
    }
  });

  if (!response.ok) throw new Error(`Jira request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function toSprint(value: NonNullable<JiraSprintResponse["values"]>[number]): JiraSprint {
  return {
    id: value.id,
    name: value.name,
    state: value.state,
    startDate: value.startDate,
    endDate: value.endDate
  };
}

function toIssue(siteUrl: string, issue: JiraApiIssue): JiraIssue {
  return {
    id: issue.id,
    key: issue.key,
    summary: issue.fields?.summary ?? "Untitled issue",
    status: issue.fields?.status?.name ?? "Unknown",
    assignee: issue.fields?.assignee?.displayName ?? undefined,
    priority: issue.fields?.priority?.name ?? undefined,
    url: `${siteUrl}/browse/${issue.key}`,
    updatedAt: issue.fields?.updated ?? new Date().toISOString()
  };
}
