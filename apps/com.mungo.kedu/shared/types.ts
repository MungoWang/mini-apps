export type Priority = 1 | 2 | 3 | 4;

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

export type TaskImage = {
  id: string;
  w: number;
  h: number;
};

export type Task = {
  id: string;
  title: string;
  notes: string;
  done: boolean;
  priority: Priority;
  tags: string[];
  starts: string | null; // range start (YYYY-MM-DD); equals due for a single day
  due: string | null; // due date, or the END of a range
  startTime: string | null; // "HH:MM"
  endTime: string | null; // "HH:MM"
  subtasks: Subtask[];
  images: TaskImage[];
  order: number;
  createdAt: number;
  completedAt: number | null;
};

export type ViewId = "today" | "inbox" | "upcoming" | "done" | "board" | "stats";

export type SortId = "manual" | "due" | "priority" | "created";

export type TaskPatch = Partial<Omit<Task, "id" | "createdAt" | "order">>;

export type Pack = { tasks: Task[]; tags: string[] };

export const PRIORITY_ORDER: Priority[] = [1, 2, 3, 4];
export const PRIORITY_LABEL: Record<Priority, string> = { 1: "P1", 2: "P2", 3: "P3", 4: "P4" };
export const PRIORITY_TITLE: Record<Priority, string> = { 1: "紧急", 2: "高", 3: "中", 4: "低" };
