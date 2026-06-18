"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewKey =
  | "home"
  | "courses"
  | "course-detail"
  | "script-generator"
  | "tools"
  | "dashboard"
  | "admin"
  | "auth"
  | "workspace";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: "STUDENT" | "ADMIN";
  avatar?: string | null;
}

interface AppState {
  view: ViewKey;
  selectedCourseId: string | null;
  selectedTool: string | null; // for tools view sub-tabs
  user: CurrentUser | null;
  setView: (view: ViewKey) => void;
  openCourse: (id: string) => void;
  selectTool: (tool: string) => void;
  setUser: (user: CurrentUser | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: "home",
      selectedCourseId: null,
      selectedTool: null,
      user: null,
      setView: (view) => {
        set({ view });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      },
      openCourse: (id) => {
        set({ selectedCourseId: id, view: "course-detail" });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      },
      selectTool: (tool) => set({ selectedTool: tool }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, view: "home" }),
    }),
    {
      name: "yingshu-store",
      partialize: (state) => ({
        user: state.user,
        view: state.view,
        selectedCourseId: state.selectedCourseId,
      }),
    }
  )
);
