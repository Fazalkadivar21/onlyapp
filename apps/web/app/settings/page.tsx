import { PageHeader } from "@/components/page-header";

const envNames = ["DATABASE_URL", "REDIS_URL", "ENCRYPTION_KEY", "APP_URL", "WORKER_TOKEN", "WHATSAPP_CONNECTOR_URL", "WHATSAPP_CONNECTOR_TOKEN", "CLOUDINARY_CLOUD_NAME", "AI_PROVIDER", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OLLAMA_BASE_URL", "GITHUB_TOKEN", "GITHUB_REPOSITORIES", "GITHUB_USERNAME", "JIRA_SITE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_BOARD_ID", "JIRA_PROJECT_KEY"];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Single-user app settings, env health, and provider configuration." />
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Required environment</h2>
        <div className="mt-4 grid gap-2">
          {envNames.map((name) => <div key={name} className="rounded-2xl bg-zinc-100 px-4 py-3 font-mono text-sm">{name}</div>)}
        </div>
      </div>
    </div>
  );
}
