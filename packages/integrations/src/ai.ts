export type AiProviderName = "openai" | "anthropic" | "ollama";

export type AiProvider = {
  name: AiProviderName;
  summarize(prompt: string): Promise<string>;
};

export function createAiProvider(name = process.env.AI_PROVIDER): AiProvider | null {
  if (name === "openai" && process.env.OPENAI_API_KEY) return openAiProvider();
  if (name === "anthropic" && process.env.ANTHROPIC_API_KEY) return anthropicProvider();
  if (name === "ollama" && process.env.OLLAMA_BASE_URL) return ollamaProvider();

  if (process.env.OPENAI_API_KEY) return openAiProvider();
  if (process.env.ANTHROPIC_API_KEY) return anthropicProvider();
  if (process.env.OLLAMA_BASE_URL) return ollamaProvider();

  return null;
}

function openAiProvider(): AiProvider {
  return {
    name: "openai",
    async summarize(prompt) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          messages: [
            { role: "system", content: "You write concise daily work briefs. Focus on urgent actions, blockers, and order of operations." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        })
      });

      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI failed: ${response.status}`);
      return payload.choices?.[0]?.message?.content?.trim() ?? "No summary generated.";
    }
  };
}

function anthropicProvider(): AiProvider {
  return {
    name: "anthropic",
    async summarize(prompt) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
          max_tokens: 700,
          system: "You write concise daily work briefs. Focus on urgent actions, blockers, and order of operations.",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const payload = (await response.json()) as { content?: Array<{ type: string; text?: string }>; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? `Anthropic failed: ${response.status}`);
      return payload.content?.find((part) => part.type === "text")?.text?.trim() ?? "No summary generated.";
    }
  };
}

function ollamaProvider(): AiProvider {
  return {
    name: "ollama",
    async summarize(prompt) {
      const baseUrl = process.env.OLLAMA_BASE_URL?.replace(/\/$/, "");
      if (!baseUrl) throw new Error("OLLAMA_BASE_URL is required");

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL ?? "llama3.1",
          stream: false,
          messages: [
            { role: "system", content: "You write concise daily work briefs. Focus on urgent actions, blockers, and order of operations." },
            { role: "user", content: prompt }
          ]
        })
      });

      const payload = (await response.json()) as { message?: { content?: string }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Ollama failed: ${response.status}`);
      return payload.message?.content?.trim() ?? "No summary generated.";
    }
  };
}
