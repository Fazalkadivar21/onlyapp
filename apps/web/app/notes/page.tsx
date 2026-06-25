import { PageHeader } from "@/components/page-header";

export default function NotesPage() {
  return (
    <div>
      <PageHeader title="Notes" description="Notion-lite notes. TipTap, slash commands, autosave, and activity links come next." />
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl bg-white p-5 shadow-sm">
          <button className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">New note</button>
          <div className="mt-4 rounded-2xl bg-zinc-100 p-3 text-sm">Daily scratchpad</div>
        </aside>
        <section className="min-h-[420px] rounded-3xl bg-white p-6 shadow-sm">
          <input className="w-full border-none text-3xl font-semibold outline-none" defaultValue="Daily scratchpad" />
          <div className="mt-8 rounded-2xl border border-dashed border-black/20 p-8 text-zinc-500">Editor placeholder</div>
        </section>
      </div>
    </div>
  );
}
