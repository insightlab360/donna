"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { todayKST } from "@/lib/date";
import { TASK_STATUSES, WORK_TYPES, type Task, type TaskStatus, type WorkType } from "@/lib/types";
import { taskFormSchema } from "@/lib/validation";
import { sortProjectsForDisplay } from "@/lib/tasks-logic";
import { Button } from "@/components/ui/Button";
import { NotesSection } from "@/components/notes/NotesSection";

interface TaskFormProps {
  task?: Task;
  initialDate?: string;
  initialProjectId?: string | null;
  onDone: () => void;
}

export function TaskForm({ task, initialDate, initialProjectId, onDone }: TaskFormProps) {
  const { projects, createTask, updateTask, deleteTask, createProject } = useData();

  const [workType, setWorkType] = useState<WorkType>(task?.work_type ?? "회사");
  const [title, setTitle] = useState(task?.title ?? "");
  const [projectId, setProjectId] = useState<string>(task?.project_id ?? initialProjectId ?? "");
  const [dateKind, setDateKind] = useState<"single" | "period" | "none">(() => {
    if (!task) return "single";
    if (task.date_mode === "none") return "none";
    if (task.date_mode === "date_range" || task.date_mode === "datetime_range") return "period";
    return "single";
  });
  const [hasTime, setHasTime] = useState(
    task ? task.date_mode === "datetime" || task.date_mode === "datetime_range" : false
  );
  const [startDate, setStartDate] = useState(task?.start_date ?? initialDate ?? todayKST());
  const [startTime, setStartTime] = useState(task?.start_time?.slice(0, 5) ?? "");
  const [endDate, setEndDate] = useState(task?.end_date ?? "");
  const [endTime, setEndTime] = useState(task?.end_time?.slice(0, 5) ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "예정");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectSubmitting, setNewProjectSubmitting] = useState(false);
  const [newProjectError, setNewProjectError] = useState<string | null>(null);

  const isPeriod = dateKind === "period";
  const isUndetermined = dateKind === "none";
  const needsStartTime = hasTime && !isUndetermined;
  const needsEndDate = isPeriod;
  const needsEndTime = isPeriod && hasTime;
  const dateMode = isUndetermined
    ? ("none" as const)
    : isPeriod
      ? hasTime
        ? ("datetime_range" as const)
        : ("date_range" as const)
      : hasTime
        ? ("datetime" as const)
        : ("date" as const);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const payload = {
      work_type: workType,
      title,
      project_id: projectId || null,
      date_mode: dateMode,
      start_date: isUndetermined ? null : startDate,
      start_time: needsStartTime ? startTime || null : null,
      end_date: needsEndDate ? endDate || null : null,
      end_time: needsEndTime ? endTime || null : null,
      status,
    };

    const result = taskFormSchema.safeParse(payload);
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
      if (task) {
        await updateTask(task.id, result.data);
      } else {
        await createTask(result.data);
      }
      onDone();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) {
      setNewProjectError("프로젝트명을 입력해주세요");
      return;
    }
    setNewProjectSubmitting(true);
    setNewProjectError(null);
    try {
      const project = await createProject({
        name,
        work_type: workType,
        start_date: null,
        end_date: null,
        status: "예정",
      });
      setProjectId(project.id);
      setCreatingProject(false);
      setNewProjectName("");
    } catch (err) {
      setNewProjectError(err instanceof Error ? err.message : "프로젝트 생성에 실패했습니다");
    } finally {
      setNewProjectSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm("이 Task를 삭제하시겠습니까?")) return;
    setSubmitting(true);
    try {
      await deleteTask(task.id);
      onDone();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "삭제에 실패했습니다");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="업무종류">
        <div className="flex gap-1.5">
          {WORK_TYPES.map((wt) => (
            <button
              type="button"
              key={wt}
              onClick={() => setWorkType(wt)}
              className={
                "flex-1 rounded-md border px-2 py-1.5 text-sm transition-colors " +
                (workType === wt
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
              }
            >
              {wt}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Task" error={errors.title}>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task를 입력하세요"
          className={inputClass(!!errors.title)}
        />
      </Field>

      <Field label="상위 프로젝트 (선택)">
        {creatingProject ? (
          <div>
            <div className="flex gap-1.5">
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateProject();
                  }
                }}
                placeholder="새 프로젝트명"
                className={inputClass(!!newProjectError)}
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleCreateProject} disabled={newProjectSubmitting}>
                {newProjectSubmitting ? "추가 중..." : "추가"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCreatingProject(false);
                  setNewProjectName("");
                  setNewProjectError(null);
                }}
                disabled={newProjectSubmitting}
              >
                취소
              </Button>
            </div>
            {newProjectError && <p className="mt-1 text-xs text-red-600">{newProjectError}</p>}
          </div>
        ) : (
          <select
            value={projectId}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setCreatingProject(true);
              } else {
                setProjectId(e.target.value);
              }
            }}
            className={inputClass(false)}
          >
            <option value="">없음</option>
            {sortProjectsForDisplay(projects).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="__new__">+ 새 프로젝트 추가</option>
          </select>
        )}
      </Field>

      <Field label="일시">
        <div className="mb-1.5 flex gap-1.5">
          <button
            type="button"
            onClick={() => setDateKind("single")}
            className={
              "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors " +
              (dateKind === "single" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
            }
          >
            특정 날짜
          </button>
          <button
            type="button"
            onClick={() => setDateKind("period")}
            className={
              "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors " +
              (dateKind === "period" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
            }
          >
            기간
          </button>
          <button
            type="button"
            onClick={() => setDateKind("none")}
            className={
              "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors " +
              (dateKind === "none" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
            }
          >
            기한 미정
          </button>
        </div>

        {isUndetermined ? (
          <p className="rounded-md bg-neutral-50 px-2.5 py-2 text-xs text-neutral-500">
            날짜 없이 저장됩니다. &ldquo;오늘&rdquo;/&ldquo;캘린더&rdquo;의 기한 미정 목록에서 확인할 수 있습니다.
          </p>
        ) : (
          <>
            <div className="mb-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => setHasTime(false)}
                className={
                  "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors " +
                  (!hasTime ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
                }
              >
                시간 지정 없음
              </button>
              <button
                type="button"
                onClick={() => setHasTime(true)}
                className={
                  "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors " +
                  (hasTime ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
                }
              >
                시간 추가
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="mb-1 block text-[11px] text-neutral-500">{needsEndDate ? "시작일" : "날짜"}</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass(false)}
                />
              </div>
              {needsStartTime && (
                <div>
                  <span className="mb-1 block text-[11px] text-neutral-500">시작 시간</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputClass(!!errors.start_time)}
                  />
                </div>
              )}
              {needsEndDate && (
                <div>
                  <span className="mb-1 block text-[11px] text-neutral-500">종료일</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass(!!errors.end_date)}
                  />
                </div>
              )}
              {needsEndTime && (
                <div>
                  <span className="mb-1 block text-[11px] text-neutral-500">종료 시간</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={inputClass(!!errors.end_time)}
                  />
                </div>
              )}
            </div>
            {(errors.start_time || errors.end_date || errors.end_time) && (
              <p className="mt-1 text-xs text-red-600">
                {errors.start_time || errors.end_date || errors.end_time}
              </p>
            )}
          </>
        )}
      </Field>

      <Field label="진행현황">
        <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={inputClass(false)}>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      {task && <NotesSection kind="task" recordId={task.id} />}

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="mt-2 flex items-center justify-between gap-2">
        {task ? (
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}

function inputClass(hasError: boolean) {
  return (
    "w-full rounded-md border px-2.5 py-1.5 text-sm text-black outline-none focus:border-black " +
    (hasError ? "border-red-400" : "border-neutral-300")
  );
}
