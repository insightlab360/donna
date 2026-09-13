"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectInput, ProjectNote, Task, TaskInput, TaskNote } from "@/lib/types";

interface DataContextValue {
  tasks: Task[];
  projects: Project[];
  taskNotes: TaskNote[];
  projectNotes: ProjectNote[];
  loading: boolean;
  error: string | null;
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, patch: Partial<TaskInput>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  createProject: (input: ProjectInput) => Promise<Project>;
  updateProject: (id: string, patch: Partial<ProjectInput>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addTaskNote: (taskId: string, content: string) => Promise<TaskNote>;
  updateTaskNote: (id: string, content: string) => Promise<TaskNote>;
  deleteTaskNote: (id: string) => Promise<void>;
  addProjectNote: (projectId: string, content: string) => Promise<ProjectNote>;
  updateProjectNote: (id: string, content: string) => Promise<ProjectNote>;
  deleteProjectNote: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  /** Tasks whose displayed range overlaps [start, end] — for the calendar, which should not load the user's entire task history. */
  fetchTasksInRange: (start: string, end: string) => Promise<Task[]>;
}

const TASK_COLUMNS = "id,user_id,work_type,title,project_id,date_mode,start_date,start_time,end_date,end_time,due_date,status,created_at,updated_at";

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [tasksRes, projectsRes, taskNotesRes, projectNotesRes] = await Promise.all([
      supabase.from("tasks").select(TASK_COLUMNS).order("due_date", { ascending: true }),
      supabase.from("projects").select("id,user_id,name,work_type,start_date,end_date,status,created_at,updated_at").order("created_at", { ascending: false }),
      supabase.from("task_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("project_notes").select("*").order("created_at", { ascending: false }),
    ]);
    if (tasksRes.error) setError(tasksRes.error.message);
    if (projectsRes.error) setError(projectsRes.error.message);
    setTasks((tasksRes.data as Task[]) ?? []);
    setProjects((projectsRes.data as Project[]) ?? []);
    setTaskNotes((taskNotesRes.data as TaskNote[]) ?? []);
    setProjectNotes((projectNotesRes.data as ProjectNote[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a render-triggered cascade
    refresh();
  }, [refresh]);

  const createTask = useCallback(
    async (input: TaskInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw new Error(error.message);

      const task = data as Task;
      setTasks((prev) => [...prev, task]);
      return task;
    },
    [supabase]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<TaskInput>) => {
      // Optimistic: reflect the change immediately (status dropdowns etc. feel instant),
      // then reconcile with — or roll back to — the server's response.
      let previous: Task | undefined;
      setTasks((prev) => {
        previous = prev.find((t) => t.id === id);
        return prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      });

      const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select().single();
      if (error) {
        if (previous) {
          const rollback = previous;
          setTasks((prev) => prev.map((t) => (t.id === id ? rollback : t)));
        }
        throw new Error(error.message);
      }

      const task = data as Task;
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
      return task;
    },
    [supabase]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [supabase]
  );

  const createProject = useCallback(
    async (input: ProjectInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw new Error(error.message);

      const project = data as Project;
      setProjects((prev) => [project, ...prev]);
      return project;
    },
    [supabase]
  );

  const updateProject = useCallback(
    async (id: string, patch: Partial<ProjectInput>) => {
      let previous: Project | undefined;
      setProjects((prev) => {
        previous = prev.find((p) => p.id === id);
        return prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      });

      const { data, error } = await supabase
        .from("projects")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if (previous) {
          const rollback = previous;
          setProjects((prev) => prev.map((p) => (p.id === id ? rollback : p)));
        }
        throw new Error(error.message);
      }

      const project = data as Project;
      setProjects((prev) => prev.map((p) => (p.id === id ? project : p)));
      return project;
    },
    [supabase]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTasks((prev) => prev.map((t) => (t.project_id === id ? { ...t, project_id: null } : t)));
    },
    [supabase]
  );

  const addTaskNote = useCallback(
    async (taskId: string, content: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { data, error } = await supabase
        .from("task_notes")
        .insert({ task_id: taskId, user_id: user.id, content })
        .select()
        .single();
      if (error) throw new Error(error.message);

      const note = data as TaskNote;
      setTaskNotes((prev) => [note, ...prev]);
      return note;
    },
    [supabase]
  );

  const updateTaskNote = useCallback(
    async (id: string, content: string) => {
      const { data, error } = await supabase.from("task_notes").update({ content }).eq("id", id).select().single();
      if (error) throw new Error(error.message);

      const note = data as TaskNote;
      setTaskNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
      return note;
    },
    [supabase]
  );

  const deleteTaskNote = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("task_notes").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setTaskNotes((prev) => prev.filter((n) => n.id !== id));
    },
    [supabase]
  );

  const addProjectNote = useCallback(
    async (projectId: string, content: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { data, error } = await supabase
        .from("project_notes")
        .insert({ project_id: projectId, user_id: user.id, content })
        .select()
        .single();
      if (error) throw new Error(error.message);

      const note = data as ProjectNote;
      setProjectNotes((prev) => [note, ...prev]);
      return note;
    },
    [supabase]
  );

  const updateProjectNote = useCallback(
    async (id: string, content: string) => {
      const { data, error } = await supabase.from("project_notes").update({ content }).eq("id", id).select().single();
      if (error) throw new Error(error.message);

      const note = data as ProjectNote;
      setProjectNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
      return note;
    },
    [supabase]
  );

  const deleteProjectNote = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("project_notes").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setProjectNotes((prev) => prev.filter((n) => n.id !== id));
    },
    [supabase]
  );

  const fetchTasksInRange = useCallback(
    async (start: string, end: string) => {
      // Overlap test: the task's display window starts on/before `end` and ends
      // (due_date, already coalesced to end_date by a DB trigger) on/after `start`.
      // Tasks with date_mode 'none' have a null start_date/due_date and never match.
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_COLUMNS)
        .lte("start_date", end)
        .gte("due_date", start)
        .order("due_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data as Task[]) ?? [];
    },
    [supabase]
  );

  const value: DataContextValue = {
    tasks,
    projects,
    taskNotes,
    projectNotes,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    createProject,
    updateProject,
    deleteProject,
    addTaskNote,
    updateTaskNote,
    deleteTaskNote,
    addProjectNote,
    updateProjectNote,
    deleteProjectNote,
    refresh,
    fetchTasksInRange,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
