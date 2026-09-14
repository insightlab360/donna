"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { PROJECT_STATUSES, WORK_TYPES, type Project, type ProjectStatus, type WorkType } from "@/lib/types";
import { projectFormSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { NotesSection } from "@/components/notes/NotesSection";

interface ProjectFormProps {
  project?: Project;
  onDone: () => void;
}

export function ProjectForm({ project, onDone }: ProjectFormProps) {
  const { createProject, updateProject, deleteProject, addProjectNote } = useData();

  const [name, setName] = useState(project?.name ?? "");
  const [workType, setWorkType] = useState<WorkType>(project?.work_type ?? "회사");
  const [startDate, setStartDate] = useState(project?.start_date ?? "");
  const [endDate, setEndDate] = useState(project?.end_date ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "예정");
  const [priority, setPriority] = useState(project?.priority ?? false);
  const [memo, setMemo] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name,
      work_type: workType,
      start_date: startDate || null,
      end_date: endDate || null,
      status,
      priority,
    };

    const result = projectFormSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      if (project) {
        await updateProject(project.id, result.data);
      } else {
        const created = await createProject(result.data);
        if (memo.trim()) {
          await addProjectNote(created.id, memo.trim());
        }
      }
      onDone();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!project) return;
    if (!window.confirm("이 프로젝트를 삭제하시겠습니까? 연결된 Task의 프로젝트 연결이 해제됩니다.")) return;
    setSubmitting(true);
    try {
      await deleteProject(project.id);
      onDone();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "삭제에 실패했습니다");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">프로젝트명</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="프로젝트명을 입력하세요"
          className={inputClass(!!errors.name)}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">업무종류</span>
        <div className="flex gap-1.5">
          {WORK_TYPES.map((wt) => (
            <button
              type="button"
              key={wt}
              onClick={() => setWorkType(wt)}
              className={
                "flex-1 rounded-md border px-2 py-1.5 text-sm transition-colors " +
                (workType === wt ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
              }
            >
              {wt}
            </button>
          ))}
        </div>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">시작일</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass(false)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">마감일</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass(!!errors.end_date)} />
          {errors.end_date && <p className="mt-1 text-xs text-red-600">{errors.end_date}</p>}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">진행현황</span>
        <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={inputClass(false)}>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">우선순위</span>
        <div className="flex items-center justify-between rounded-md border border-neutral-300 px-2.5 py-1.5">
          <span className="text-sm text-neutral-700">{priority ? "우선순위 높음 — 제목이 빨간색으로 표시됩니다" : "우선순위 표시 안 함"}</span>
          <Toggle checked={priority} onChange={setPriority} activeClassName="bg-red-800" />
        </div>
      </label>

      {project ? (
        <NotesSection kind="project" recordId={project.id} />
      ) : (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">메모 (선택)</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            placeholder="진행 상황이나 특이사항을 기록하세요"
            className="w-full resize-none rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
          />
        </label>
      )}

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="mt-2 flex items-center justify-between gap-2">
        {project ? (
          <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={submitting}>
            삭제
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onDone} disabled={submitting}>
            취소
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function inputClass(hasError: boolean) {
  return (
    "w-full rounded-md border px-2.5 py-1.5 text-sm text-black outline-none focus:border-black " +
    (hasError ? "border-red-400" : "border-neutral-300")
  );
}
