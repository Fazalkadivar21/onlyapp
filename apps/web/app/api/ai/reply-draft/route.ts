import { createAiProvider } from "@mark-1/integrations";
import type { ActivitySource } from "@mark-1/shared";

export const dynamic = "force-dynamic";

const sources: ActivitySource[] = ["slack", "whatsapp", "github", "jira"];

export async function POST(request: Request) {
  const input = toReplyDraftInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Invalid reply draft payload" }, { status: 400 });

  const provider = createAiProvider(input.provider, input.model);
  if (!provider) {
    return Response.json({ draft: fallbackDraft(input), provider: "heuristic", cached: false });
  }

  try {
    const draft = await provider.summarize(buildReplyPrompt(input));
    return Response.json({ draft: cleanDraft(draft), provider: provider.name, model: input.model, cached: false });
  } catch {
    return Response.json({ draft: fallbackDraft(input), provider: "heuristic", cached: false, error: "ai_failed" });
  }
}

type ReplyDraftInput = {
  source: ActivitySource;
  title: string;
  body: string;
  actorName: string;
  provider?: string;
  model?: string;
};

function toReplyDraftInput(value: unknown): ReplyDraftInput | null {
  if (!isRecord(value)) return null;

  const source = stringValue(value.source);
  const title = stringValue(value.title)?.slice(0, 240);
  const body = stringValue(value.body)?.slice(0, 2000);
  const actorName = stringValue(value.actorName)?.slice(0, 120);
  const provider = stringValue(value.provider);
  const model = stringValue(value.model)?.slice(0, 100);

  if (!source || !sources.includes(source as ActivitySource) || !title || !body || !actorName) return null;
  return {
    source: source as ActivitySource,
    title,
    body,
    actorName,
    provider: provider && ["openai", "anthropic", "ollama"].includes(provider) ? provider : undefined,
    model
  };
}

function buildReplyPrompt(input: ReplyDraftInput) {
  return `Draft a concise, natural reply for this ${input.source} item.\n\nRules:\n- Return only the message text.\n- Be friendly, specific, and brief.\n- Do not invent facts or commitments.\n- If action is unclear, ask one clarifying question.\n\nFrom: ${input.actorName}\nTitle/context: ${input.title}\nMessage/content: ${input.body}`;
}

function fallbackDraft(input: ReplyDraftInput) {
  if (input.source === "github" || input.source === "jira") return "Thanks — I’ll take a look and follow up shortly.";
  return `Thanks ${firstName(input.actorName)} — I’ll check and get back to you shortly.`;
}

function cleanDraft(value: string) {
  return value.replace(/^```(?:text)?/i, "").replace(/```$/i, "").trim().slice(0, 2000);
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
