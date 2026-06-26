import { NotesWorkspace } from "@/components/notes-workspace";
import { PageHeader } from "@/components/page-header";

export default function NotesPage() {
  return (
    <div>
      <PageHeader title="Notes" description="Lightweight notes with DB-backed create/update and autosave. TipTap/slash commands can layer on later." />
      <NotesWorkspace />
    </div>
  );
}
