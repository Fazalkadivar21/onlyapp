import type { IntegrationSummary } from "@mark-1/shared";
import { GitHubIntegrationPanel } from "@/components/github-integration-panel";
import { JiraIntegrationPanel } from "@/components/jira-integration-panel";
import { PageHeader } from "@/components/page-header";
import { SlackIntegrationPanel } from "@/components/slack-integration-panel";
import { WhatsAppIntegrationPanel } from "@/components/whatsapp-integration-panel";

const integrations: IntegrationSummary[] = [
  { type: "ai", name: "AI Providers", status: "disconnected", description: "OpenAI, Anthropic, or Ollama-compatible summaries and drafts." }
];

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader title="Integrations" description="Connection surfaces are stubbed now; OAuth and connector flows will be wired behind these cards." />
      <div className="grid gap-4 md:grid-cols-2">
        <WhatsAppIntegrationPanel />
        <SlackIntegrationPanel />
        <GitHubIntegrationPanel />
        <JiraIntegrationPanel />
        {integrations.map((integration) => (
          <article key={integration.type} className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">{integration.name}</h2><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{integration.status}</span></div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{integration.description}</p>
            <button className="mt-5 rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white">Connect</button>
          </article>
        ))}
      </div>
    </div>
  );
}
