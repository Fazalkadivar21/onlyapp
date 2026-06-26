"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckSquare, FileText, Home, Inbox, Plug, Search, Settings } from "lucide-react";

const commands = [
  { href: "/", label: "Home", hint: "Workspace overview", icon: Home, keywords: "dashboard overview" },
  { href: "/daily-brief", label: "Daily Brief", hint: "AI summary and morning context", icon: Bell, keywords: "summary brief ai" },
  { href: "/queue", label: "Action Queue", hint: "Items needing attention", icon: CheckSquare, keywords: "tasks todos actions" },
  { href: "/inbox", label: "Inbox", hint: "Unified activity feed", icon: Inbox, keywords: "activity slack whatsapp github jira" },
  { href: "/notes", label: "Notes", hint: "Notion-lite notes", icon: FileText, keywords: "pages writing docs" },
  { href: "/integrations", label: "Integrations", hint: "Slack, WhatsApp, GitHub, Jira", icon: Plug, keywords: "connect settings oauth" },
  { href: "/settings", label: "Settings", hint: "App preferences", icon: Settings, keywords: "config preferences" }
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((command) => `${command.label} ${command.hint} ${command.keywords}`.toLowerCase().includes(needle));
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }

      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  function runCommand(index = activeIndex) {
    const command = filtered[index];
    if (!command) return;
    setOpen(false);
    setQuery("");
    router.push(command.href);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-2xl bg-zinc-100 px-4 py-3 text-left text-sm text-zinc-500 transition hover:bg-zinc-200">
        Search / jump <span className="ml-2 rounded-lg bg-white px-2 py-1 text-xs text-zinc-400">⌘K</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/35 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="mx-auto mt-24 max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
              <Search size={18} className="text-zinc-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((current) => Math.min(current + 1, filtered.length - 1));
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((current) => Math.max(current - 1, 0));
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runCommand();
                  }
                }}
                placeholder="Jump to inbox, notes, integrations…"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="max-h-96 overflow-auto p-2">
              {filtered.length === 0 ? <p className="p-5 text-sm text-zinc-500">No matching command.</p> : null}
              {filtered.map((command, index) => {
                const Icon = command.icon;
                return (
                  <button
                    key={command.href}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runCommand(index)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${index === activeIndex ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
                  >
                    <span className="rounded-xl bg-white p-2 text-zinc-700 shadow-sm"><Icon size={17} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-900">{command.label}</span>
                      <span className="block truncate text-xs text-zinc-500">{command.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
