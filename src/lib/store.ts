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
  | "workspace"
  | "cineflow"
  | "ai-copywriting"
  | "hgtts"
  | "visual-match"
  | "pricing"
  | "product-home"
  | "cineflow-suite"
  | "hgtts-pro"
  | "resources"
  | "payment"
  | "contact"
  | "suite-detail"
  | "tts-clone"
  | "copywriting-trial";

export type GeneratorStage = "小白" | "爆款" | "精选";

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
  generatorPresetStage: GeneratorStage | null;
  generatorPresetMovieTitle: string;
  user: CurrentUser | null;
  setView: (view: ViewKey) => void;
  openCourse: (id: string) => void;
  openScriptGenerator: (preset?: {
    stage?: GeneratorStage;
    movieTitle?: string;
  }) => void;
  selectTool: (tool: string) => void;
  setGeneratorPreset: (preset: {
    stage?: GeneratorStage;
    movieTitle?: string;
  }) => void;
  clearGeneratorPreset: () => void;
  setUser: (user: CurrentUser | null) => void;
  logout: () => void;
  /** 用户已点击「一键加群」跳转，标记后不再自动弹出加群弹窗 */
  qqGroupJoined: boolean;
  markQqGroupJoined: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: "home",
      selectedCourseId: null,
      selectedTool: null,
      generatorPresetStage: null,
      generatorPresetMovieTitle: "",
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
      openScriptGenerator: (preset) => {
        set({
          view: "script-generator",
          generatorPresetStage: preset?.stage ?? null,
          generatorPresetMovieTitle: preset?.movieTitle ?? "",
        });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      },
      selectTool: (tool) => set({ selectedTool: tool }),
      setGeneratorPreset: (preset) =>
        set((state) => ({
          generatorPresetStage:
            preset.stage === undefined ? state.generatorPresetStage : preset.stage,
          generatorPresetMovieTitle:
            preset.movieTitle ?? state.generatorPresetMovieTitle,
        })),
      clearGeneratorPreset: () =>
        set({ generatorPresetStage: null, generatorPresetMovieTitle: "" }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({
          user: null,
          view: "home",
          generatorPresetStage: null,
          generatorPresetMovieTitle: "",
        }),
      qqGroupJoined: false,
      markQqGroupJoined: () => set({ qqGroupJoined: true }),
    }),
    {
      name: "yingshu-store",
      partialize: (state) => ({
        user: state.user,
        view: state.view,
        selectedCourseId: state.selectedCourseId,
        generatorPresetStage: state.generatorPresetStage,
        generatorPresetMovieTitle: state.generatorPresetMovieTitle,
        qqGroupJoined: state.qqGroupJoined,
      }),
    }
  )
);

