import { PageHeader } from "@/components/page-header";

const envNames = ["DATABASE_URL", "REDIS_URL", "ENCRYPTION_KEY", "CLOUDINARY_CLOUD_NAME", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OLLAMA_BASE_URL"];

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
