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
}

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
      supabase.from("tasks").select("*").order("due_date", { ascending: true }),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
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
      const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);

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
      const { data, error } = await supabase
        .from("projects")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);

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
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
