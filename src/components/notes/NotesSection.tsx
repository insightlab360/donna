"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/Button";

interface NotesSectionProps {
  kind: "task" | "project";
  recordId: string;
}

export function NotesSection({ kind, recordId }: NotesSectionProps) {
  const { taskNotes, projectNotes, addTaskNote, updateTaskNote, deleteTaskNote, addProjectNote, updateProjectNote, deleteProjectNote } =
    useData();

  const notes = (kind === "task" ? taskNotes.filter((n) => n.task_id === recordId) : projectNotes.filter((n) => n.project_id === recordId)).sort(
    (a, b) => b.created_at.localeCompare(a.created_at)
  );

  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  async function handleAdd() {
    const content = newNote.trim();
    if (!content) return;
    setSubmitting(true);
    setError(null);
    try {
      if (kind === "task") {
        await addTaskNote(recordId, content);
      } else {
        await addProjectNote(recordId, content);
      }
      setNewNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "메모 추가에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const content = editContent.trim();
    if (!content) return;
    setSubmitting(true);
    setError(null);
    try {
      if (kind === "task") {
        await updateTaskNote(id, content);
      } else {
        await updateProjectNote(id, content);
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "메모 수정에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      if (kind === "task") {
        await deleteTaskNote(id);
      } else {
        await deleteProjectNote(id);
      }
    } catch {
      // best-effort — leave the note in place if deletion fails
    }
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-neutral-600">메모</span>
      <div className="flex gap-1.5">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAdd();
            }
          }}
          rows={2}
          placeholder="진행 상황이나 특이사항을 기록하세요"
          className="w-full resize-none rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
        />
        <Button type="button" size="sm" variant="secondary" onClick={handleAdd} disabled={submitting || !newNote.trim()}>
          추가
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {notes.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-400">기록된 메모가 없습니다.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {notes.map((note) =>
            editingId === note.id ? (
              <div key={note.id} className="rounded-md border border-neutral-200 px-2.5 py-1.5">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={2}
                  autoFocus
                  className="w-full resize-none rounded-md border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-black"
                />
                <div className="mt-1 flex justify-end gap-1.5">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={submitting}>
                    취소
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => handleSaveEdit(note.id)} disabled={submitting}>
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              <div key={note.id} className="flex items-start justify-between gap-2 rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs">
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap text-neutral-700">{note.content}</p>
                  <p className="mt-0.5 text-neutral-400">{new Date(note.created_at).toLocaleString("ko-KR")}</p>
                </div>
                <div className="flex shrink-0 gap-1.5 text-neutral-300">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(note.id);
                      setEditContent(note.content);
                    }}
                    aria-label="메모 수정"
                    className="hover:text-black"
                  >
                    수정
                  </button>
                  <button type="button" onClick={() => handleDelete(note.id)} aria-label="메모 삭제" className="hover:text-red-500">
                    ×
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
