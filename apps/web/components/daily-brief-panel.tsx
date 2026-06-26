"use client";

import { useEffect, useState } from "react";

type DailyBriefResponse = {
  brief: string;
  provider: string;
  model?: string;
  cached: boolean;
  error?: string;
};

type AiProviderChoice = "auto" | "openai" | "anthropic" | "ollama";

export function DailyBriefPanel() {
  const [brief, setBrief] = useState<DailyBriefResponse>();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [queueResult, setQueueResult] = useState<string>();
  const [providerChoice, setProviderChoice] = useState<AiProviderChoice>("auto");
  const [model, setModel] = useState("");

  async function loadBrief() {
    setLoading(true);
    try {
      const response = await fetch("/api/daily-brief", { cache: "no-store" });
      setBrief((await response.json()) as DailyBriefResponse);
    } finally {
      setLoading(false);
    }
  }

  async function generateBrief(queued = false) {
    queued ? setQueueing(true) : setGenerating(true);
    setQueueResult(undefined);
    try {
      const response = await fetch("/api/daily-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ async: queued, provider: providerChoice === "auto" ? undefined : providerChoice, model: model.trim() || undefined })
      });
      const payload = (await response.json()) as DailyBriefResponse & { queued?: boolean; jobId?: string; syncJobId?: string };
      if (payload.queued) {
        setQueueResult(`Queued daily brief job${payload.syncJobId ? ` · ${payload.syncJobId.slice(0, 8)}` : ""}. Check Sync Health for status.`);
      } else {
        setBrief(payload);
      }
    } finally {
      queued ? setQueueing(false) : setGenerating(false);
    }
  }

  useEffect(() => {
    void loadBrief();
  }, []);

  return (
    <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Daily brief</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {loading ? "Loading…" : `Provider: ${brief?.provider ?? "unknown"}${brief?.cached ? " · cached" : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={providerChoice}
            onChange={(event) => setProviderChoice(event.target.value as AiProviderChoice)}
            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            aria-label="AI provider"
          >
            <option value="auto">Auto provider</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="ollama">Ollama</option>
          </select>
          <input
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="Model override"
            className="w-40 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            aria-label="AI model override"
          />
          <button onClick={() => void generateBrief(false)} disabled={generating || queueing} className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {generating ? "Generating…" : "Generate"}
          </button>
          <button onClick={() => void generateBrief(true)} disabled={generating || queueing} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50">
            {queueing ? "Queueing…" : "Queue"}
          </button>
        </div>
      </div>

      <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
        {loading ? "Loading daily brief…" : brief?.brief}
      </div>
      {queueResult ? <p className="mt-3 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">{queueResult}</p> : null}
      {brief?.model ? <p className="mt-3 text-xs text-zinc-500">Model: {brief.model}</p> : null}
      {brief?.error ? <p className="mt-3 text-xs text-amber-700">AI failed; showing heuristic fallback.</p> : null}
    </div>
  );
}
