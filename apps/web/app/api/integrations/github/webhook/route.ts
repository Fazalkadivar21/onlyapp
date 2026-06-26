import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { activityItems, createDb } from "@mark-1/db";
import type { ActivityPriority } from "@mark-1/shared";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type GitHubWebhookItem = typeof activityItems.$inferInsert;

type PullRequestPayload = {
  action?: string;
  repository?: { full_name?: string };
  sender?: { login?: string; avatar_url?: string };
  pull_request?: {
    id?: number;
    number?: number;
    title?: string;
    html_url?: string;
    state?: string;
    draft?: boolean;
    merged?: boolean;
    user?: { login?: string };
  };
};

type IssueCommentPayload = {
  action?: string;
  repository?: { full_name?: string };
  sender?: { login?: string; avatar_url?: string };
  issue?: { id?: number; number?: number; title?: string; html_url?: string; pull_request?: unknown };
  comment?: { id?: number; body?: string; html_url?: string; user?: { login?: string } };
};

type PullRequestReviewPayload = {
  action?: string;
  repository?: { full_name?: string };
  sender?: { login?: string; avatar_url?: string };
  pull_request?: { id?: number; number?: number; title?: string; html_url?: string };
  review?: { id?: number; state?: string; body?: string; html_url?: string; user?: { login?: string } };
};

type CheckPayload = {
  action?: string;
  repository?: { full_name?: string };
  sender?: { login?: string; avatar_url?: string };
  check_run?: { id?: number; name?: string; status?: string; conclusion?: string; html_url?: string; pull_requests?: Array<{ id?: number; number?: number }> };
  check_suite?: { id?: number; status?: string; conclusion?: string; pull_requests?: Array<{ id?: number; number?: number }> };
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return Response.json({ error: "DATABASE_URL is required for GitHub webhooks" }, { status: 503 });

  const rawBody = await request.text();
  if (!isValidSignature(request, rawBody)) return Response.json({ error: "Invalid signature" }, { status: 401 });

  const event = request.headers.get("x-github-event") ?? "unknown";
  const delivery = request.headers.get("x-github-delivery") ?? randomUUID();
  const payload = JSON.parse(rawBody) as unknown;
  const item = normalizeWebhook(event, delivery, payload);

  if (!item) return Response.json({ accepted: true, ignored: true, event });

  const db = createDb();
  const [existing] = await db
    .select({ id: activityItems.id })
    .from(activityItems)
    .where(and(eq(activityItems.source, item.source), eq(activityItems.sourceId, item.sourceId)))
    .limit(1);

  if (existing) return Response.json({ accepted: true, deduped: true, event, itemId: existing.id });

  const [created] = await db.insert(activityItems).values(item).returning({ id: activityItems.id });
  return Response.json({ accepted: true, event, itemId: created?.id }, { status: 202 });
}

function normalizeWebhook(event: string, delivery: string, payload: unknown): GitHubWebhookItem | null {
  if (!isRecord(payload)) return null;

  if (event === "pull_request") return normalizePullRequest(delivery, payload as PullRequestPayload);
  if (event === "issue_comment") return normalizeIssueComment(delivery, payload as IssueCommentPayload);
  if (event === "pull_request_review") return normalizePullRequestReview(delivery, payload as PullRequestReviewPayload);
  if (event === "check_run" || event === "check_suite") return normalizeCheck(event, delivery, payload as CheckPayload);
  return null;
}

function normalizePullRequest(delivery: string, payload: PullRequestPayload): GitHubWebhookItem | null {
  const pr = payload.pull_request;
  if (!pr?.id || !pr.number || !pr.title) return null;

  const action = payload.action ?? "updated";
  const repo = payload.repository?.full_name ?? "unknown/repo";
  const actor = payload.sender?.login ?? pr.user?.login ?? "GitHub";
  const merged = Boolean(action === "closed" && pr.merged);

  return {
    source: "github",
    sourceId: `github_webhook_pr_${delivery}`,
    type: merged ? "pull_request_merged" : `pull_request_${action}`,
    title: `${repo}#${pr.number}: ${pr.title}`,
    body: `${actor} ${merged ? "merged" : action.replace(/_/g, " ")} PR #${pr.number}.`,
    actorName: actor,
    actorAvatar: payload.sender?.avatar_url,
    url: pr.html_url,
    priority: priorityForPullRequest(action, Boolean(pr.draft), merged),
    status: "unread",
    metadata: { event: "pull_request", action, repository: repo, number: pr.number, state: pr.state, draft: pr.draft, merged }
  };
}

function normalizeIssueComment(delivery: string, payload: IssueCommentPayload): GitHubWebhookItem | null {
  if (!payload.issue?.pull_request || !payload.comment?.id || !payload.issue.number) return null;

  const repo = payload.repository?.full_name ?? "unknown/repo";
  const actor = payload.comment.user?.login ?? payload.sender?.login ?? "GitHub";
  const body = payload.comment.body ?? "Comment added.";

  return {
    source: "github",
    sourceId: `github_webhook_comment_${payload.comment.id}_${delivery}`,
    type: "pull_request_comment",
    title: `Comment on ${repo}#${payload.issue.number}`,
    body: `${actor}: ${body.slice(0, 500)}`,
    actorName: actor,
    actorAvatar: payload.sender?.avatar_url,
    url: payload.comment.html_url ?? payload.issue.html_url,
    priority: containsMention(body) ? "high" : "normal",
    status: "unread",
    metadata: { event: "issue_comment", action: payload.action, repository: repo, number: payload.issue.number, commentId: payload.comment.id, mentionedUser: containsMention(body) }
  };
}

function normalizePullRequestReview(delivery: string, payload: PullRequestReviewPayload): GitHubWebhookItem | null {
  if (!payload.review?.id || !payload.pull_request?.number) return null;

  const repo = payload.repository?.full_name ?? "unknown/repo";
  const actor = payload.review.user?.login ?? payload.sender?.login ?? "GitHub";
  const state = payload.review.state ?? "reviewed";

  return {
    source: "github",
    sourceId: `github_webhook_review_${payload.review.id}_${delivery}`,
    type: "pull_request_review",
    title: `${state} review on ${repo}#${payload.pull_request.number}`,
    body: `${actor} submitted a ${state} review${payload.review.body ? `: ${payload.review.body.slice(0, 500)}` : "."}`,
    actorName: actor,
    actorAvatar: payload.sender?.avatar_url,
    url: payload.review.html_url ?? payload.pull_request.html_url,
    priority: state === "changes_requested" ? "high" : "normal",
    status: "unread",
    metadata: { event: "pull_request_review", action: payload.action, repository: repo, number: payload.pull_request.number, reviewId: payload.review.id, reviewState: state }
  };
}

function normalizeCheck(event: string, delivery: string, payload: CheckPayload): GitHubWebhookItem | null {
  const check = payload.check_run ?? payload.check_suite;
  if (!check?.id) return null;

  const conclusion = check.conclusion ?? check.status ?? "unknown";
  if (!["failure", "cancelled", "timed_out", "action_required"].includes(conclusion)) return null;

  const repo = payload.repository?.full_name ?? "unknown/repo";
  const pr = check.pull_requests?.[0];
  const actor = payload.sender?.login ?? "GitHub";
  const checkUrl = payload.check_run?.html_url;

  return {
    source: "github",
    sourceId: `github_webhook_${event}_${check.id}_${delivery}`,
    type: "pull_request_failed_check",
    title: `Failed check${pr?.number ? ` on ${repo}#${pr.number}` : ` in ${repo}`}`,
    body: `${event === "check_run" && "name" in check && check.name ? check.name : "Check"} finished with ${conclusion}.`,
    actorName: actor,
    actorAvatar: payload.sender?.avatar_url,
    url: checkUrl,
    priority: "high",
    status: "unread",
    metadata: { event, action: payload.action, repository: repo, number: pr?.number, checkId: check.id, conclusion }
  };
}

function isValidSignature(request: Request, rawBody: string) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true;

  const signature = request.headers.get("x-hub-signature-256");
  if (!signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return signatureBuffer.length === expectedBuffer.length && timingSafeEqual(signatureBuffer, expectedBuffer);
}

function priorityForPullRequest(action: string, draft: boolean, merged: boolean): ActivityPriority {
  if (draft || merged) return "low";
  if (["review_requested", "ready_for_review", "reopened"].includes(action)) return "high";
  return "normal";
}

function containsMention(value: string) {
  const username = process.env.GITHUB_USERNAME;
  return username ? value.toLowerCase().includes(`@${username.toLowerCase()}`) : /@[a-z0-9-]+/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
