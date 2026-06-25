import Link from "next/link";
import { Bell, CheckSquare, FileText, Home, Inbox, Plug, Settings } from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/daily-brief", label: "Daily Brief", icon: Bell },
  { href: "/queue", label: "Action Queue", icon: CheckSquare },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-black/10 bg-[#151515] p-5 text-white">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">mark-1</p>
          <h1 className="mt-2 text-2xl font-semibold">Command Center</h1>
        </div>
        <nav className="grid gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white">
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="p-5 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-black/10 bg-white/70 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Personal unified workspace</p>
              <h2 className="text-2xl font-semibold">Today&apos;s work, one surface.</h2>
            </div>
            <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500">Search coming soon ⌘K</div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
