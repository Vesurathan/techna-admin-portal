"use client";

import { useEffect, useMemo, useState } from "react";
import { notesApi } from "@/app/lib/api";
import { useAuth } from "@/app/contexts/AuthContext";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";
import { Plus, Trash2, Save } from "lucide-react";

type Note = {
  id: string;
  title: string | null;
  body: string;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export default function NotesPage() {
  const { hasPermission, isSuperAdmin } = useAuth();
  const { showNotice } = useAppNotice();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);

  const canUse = isSuperAdmin() || hasPermission("notes");

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await notesApi.list();
      setNotes((res.notes || []) as Note[]);
    } catch (e: any) {
      showNotice({ message: e?.message || "Failed to load notes", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canUse) return;
    void loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse]);

  const sortedNotes = useMemo(() => notes, [notes]);

  if (!canUse) {
    return (
      <div className="card bg-card border border-border shadow-sm">
        <div className="card-body p-5">
          <h1 className="text-2xl font-bold text-foreground">Notes</h1>
          <p className="text-muted-foreground mt-2">You don’t have permission to access notes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notes</h1>
          <p className="text-muted-foreground mt-2">Internal notes</p>
        </div>
      </div>

      <div className="card bg-card border border-border shadow-sm">
        <div className="card-body p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">New note</h2>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-2"
              disabled={saving || !draftBody.trim()}
              onClick={async () => {
                try {
                  setSaving(true);
                  await notesApi.create({
                    title: draftTitle.trim() ? draftTitle.trim() : null,
                    body: draftBody,
                  });
                  setDraftTitle("");
                  setDraftBody("");
                  await loadNotes();
                  showNotice({ message: "Note created", variant: "success" });
                } catch (e: any) {
                  showNotice({ message: e?.message || "Failed to create note", variant: "error" });
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <input
              type="text"
              className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
              placeholder="Title (optional)"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              disabled={saving}
            />
            <textarea
              className="textarea textarea-bordered w-full border-border focus:border-primary focus:outline-none min-h-32"
              placeholder="Write a note…"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      <div className="card bg-card border border-border shadow-md">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : sortedNotes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No notes yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedNotes.map((n) => (
                <NoteRow
                  key={n.id}
                  note={n}
                  onDelete={async () => {
                    try {
                      await notesApi.delete(n.id);
                      setNotes((prev) => prev.filter((x) => x.id !== n.id));
                      showNotice({ message: "Note deleted", variant: "success" });
                    } catch (e: any) {
                      showNotice({ message: e?.message || "Failed to delete note", variant: "error" });
                    }
                  }}
                  onSave={async (next) => {
                    try {
                      setSaving(true);
                      const res = await notesApi.update(n.id, next);
                      const updated = (res.note || null) as Note | null;
                      if (updated) {
                        setNotes((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
                      }
                      showNotice({ message: "Note updated", variant: "success" });
                    } catch (e: any) {
                      showNotice({ message: e?.message || "Failed to update note", variant: "error" });
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteRow({
  note,
  onDelete,
  onSave,
}: {
  note: Note;
  onDelete: () => Promise<void>;
  onSave: (next: { title?: string | null; body: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(note.title ?? "");
  const [body, setBody] = useState(note.body);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <div className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <input
            className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
            value={title}
            placeholder="Title (optional)"
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            disabled={saving}
          />
          <textarea
            className="textarea textarea-bordered w-full border-border focus:border-primary focus:outline-none min-h-28 mt-3"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setDirty(true);
            }}
            disabled={saving}
          />
          <div className="mt-2 text-xs text-muted-foreground">
            {note.createdBy ? `By ${note.createdBy.name}` : "—"}
            {note.updatedAt ? ` · Updated ${new Date(note.updatedAt).toLocaleString()}` : ""}
          </div>
        </div>

        <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:pl-4">
          <button
            type="button"
            className="btn btn-outline btn-sm gap-2"
            disabled={!dirty || saving || !body.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({ title: title.trim() ? title.trim() : null, body });
                setDirty(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button type="button" className="btn btn-delete btn-sm gap-2" disabled={saving} onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

