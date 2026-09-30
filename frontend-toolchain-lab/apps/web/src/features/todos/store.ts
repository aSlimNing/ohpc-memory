import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createTask, toggleTask, type Task } from "@lab/shared";

interface TaskState {
  tasks: Task[];
  add: (title: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      add: (title) => set((s) => ({ tasks: [...s.tasks, createTask(title)] })),
      toggle: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? toggleTask(t) : t)) })),
      clear: () => set({ tasks: [] }),
    }),
    { name: "lab-tasks" }
  )
);
