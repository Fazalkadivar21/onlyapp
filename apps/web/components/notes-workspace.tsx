"use client";

import { useEffect, useMemo, useState } from "react";

type NoteRow = {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt: string;
};

type NotesResponse = {
  notes: NoteRow[];
  source: "database" | "mock";
  error?: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function NotesWorkspace() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [source, setSource] = useState<NotesResponse["source"]>("mock");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedId) ?? notes[0], [notes, selectedId]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/notes", { cache: "no-store" })
      .then((response) => response.json() as Promise<NotesResponse>)
      .then((payload) => {
        if (cancelled) return;
        setNotes(payload.notes);
        setSelectedId(payload.notes[0]?.id);
        setSource(payload.source);
        setError(payload.error);
      })
      .catch(() => setError("request_failed"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedNote || source !== "database") return;

    setSaveState("saving");
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/notes", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: selectedNote.id, title: selectedNote.title, content: selectedNote.content })
        });

        if (!response.ok) throw new Error("save_failed");
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [selectedNote?.id, selectedNote?.title, selectedNote?.content, source]);

  async function createNote() {
    const optimistic: NoteRow = {
      id: `local_${crypto.randomUUID()}`,
      title: "Untitled",
      content: "",
      updatedAt: new Date().toISOString()
    };

    setNotes((current) => [optimistic, ...current]);
    setSelectedId(optimistic.id);

    if (source !== "database") return;

    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: optimistic.title, content: optimistic.content })
    });
    const payload = (await response.json()) as { note?: NoteRow };
    if (payload.note) {
      setNotes((current) => current.map((note) => (note.id === optimistic.id ? payload.note! : note)));
      setSelectedId(payload.note.id);
    }
  }

  function updateSelected(patch: Partial<Pick<NoteRow, "title" | "content">>) {
    if (!selectedNote) return;
    setNotes((current) => current.map((note) => (note.id === selectedNote.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note)));
    if (source !== "database") setSaveState("saved");
  }

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <aside className="rounded-3xl bg-white p-5 shadow-sm">
        <button onClick={() => void createNote()} className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">New note</button>
        <div className="mt-3 text-xs text-zinc-500">Notes source: {source}{error ? ` (${error})` : ""}</div>
        <div className="mt-4 grid gap-2">
          {loading ? <div className="rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-500">Loading notes…</div> : null}
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setSelectedId(note.id)}
              className={`rounded-2xl p-3 text-left text-sm transition ${selectedNote?.id === note.id ? "bg-black text-white" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"}`}
            >
              <span className="block truncate font-medium">{note.title || "Untitled"}</span>
              <span className="mt-1 block truncate text-xs opacity-60">{note.content || "Empty note"}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-h-[520px] rounded-3xl bg-white p-6 shadow-sm">
        {!selectedNote ? (
          <div className="rounded-2xl border border-dashed border-black/20 p-8 text-zinc-500">Create a note to start writing.</div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-4">
              <input
                className="w-full border-none text-3xl font-semibold outline-none"
                value={selectedNote.title}
                onChange={(event) => updateSelected({ title: event.target.value })}
                placeholder="Untitled"
              />
              <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">{saveLabel(saveState, source)}</span>
            </div>
            <textarea
              className="min-h-[390px] w-full resize-none rounded-2xl border border-zinc-200 p-4 text-sm leading-7 outline-none focus:border-zinc-400"
              value={selectedNote.content}
              onChange={(event) => updateSelected({ content: event.target.value })}
              placeholder="Write notes, bullets, follow-ups, decisions…"
            />
          </>
        )}
      </section>
    </div>
  );
}

function saveLabel(state: SaveState, source: NotesResponse["source"]) {
  if (source === "mock") return "local only";
  if (state === "saving") return "saving…";
  if (state === "saved") return "saved";
  if (state === "error") return "save failed";
  return "idle";
}
