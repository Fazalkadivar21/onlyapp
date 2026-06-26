import { createAiProvider } from "@mark-1/integrations";
import type { ActivitySource } from "@mark-1/shared";

export const dynamic = "force-dynamic";

const sources: ActivitySource[] = ["slack", "whatsapp", "github", "jira"];

export async function POST(request: Request) {
  const input = toSummaryInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Invalid activity summary payload" }, { status: 400 });

  const provider = createAiProvider(input.provider, input.model);
  if (!provider) return Response.json({ summary: fallbackSummary(input), provider: "heuristic", cached: false });

  try {
    const summary = await provider.summarize(buildSummaryPrompt(input));
    return Response.json({ summary: cleanSummary(summary), provider: provider.name, model: input.model, cached: false });
  } catch {
    return Response.json({ summary: fallbackSummary(input), provider: "heuristic", cached: false, error: "ai_failed" });
  }
}

type SummaryInput = {
  source: ActivitySource;
  type: string;
  title: string;
  body: string;
  actorName: string;
  metadata?: Record<string, unknown>;
  provider?: string;
  model?: string;
};

function toSummaryInput(value: unknown): SummaryInput | null {
  if (!isRecord(value)) return null;

  const source = stringValue(value.source);
  const type = stringValue(value.type)?.slice(0, 100);
  const title = stringValue(value.title)?.slice(0, 240);
  const body = stringValue(value.body)?.slice(0, 4000);
  const actorName = stringValue(value.actorName)?.slice(0, 120);
  const provider = stringValue(value.provider);
  const model = stringValue(value.model)?.slice(0, 100);

  if (!source || !sources.includes(source as ActivitySource) || !type || !title || !body || !actorName) return null;
  return {
    source: source as ActivitySource,
    type,
    title,
    body,
    actorName,
    metadata: isRecord(value.metadata) ? value.metadata : undefined,
    provider: provider && ["openai", "anthropic", "ollama"].includes(provider) ? provider : undefined,
    model
  };
}

function buildSummaryPrompt(input: SummaryInput) {
  return `Summarize this ${input.source} activity item for a personal work command center.\n\nReturn:\n- One sentence summary\n- Why it matters\n- Suggested next action\n\nKeep it concise. Do not invent facts.\n\nType: ${input.type}\nActor: ${input.actorName}\nTitle: ${input.title}\nBody: ${input.body}\nMetadata: ${JSON.stringify(scrubMetadata(input.metadata ?? {})).slice(0, 1200)}`;
}

function fallbackSummary(input: SummaryInput) {
  return [`Summary: ${input.title}`, `Why it matters: ${input.actorName} posted an update from ${input.source}.`, "Next action: Open the source item or reply if it needs your attention."].join("\n");
}

function cleanSummary(value: string) {
  return value.replace(/^```(?:text|markdown)?/i, "").replace(/```$/i, "").trim().slice(0, 2000);
}

function scrubMetadata(metadata: Record<string, unknown>) {
  const blocked = new Set(["token", "accessToken", "refreshToken", "secret", "session", "credential"]);
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !blocked.has(key.toLowerCase())));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
