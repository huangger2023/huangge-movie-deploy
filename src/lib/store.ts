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
  | "talk-fengge"
  | "activation"
  | "product-home"
  | "cineflow-suite"
  | "ai-copywriting"
  | "hgtts-pro"
  | "visual-match"
  | "resources"
  | "payment"
  | "contact"
  | "pixel-demo";

export type GeneratorStage = "爆款" | "精选";

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
  generatorPresetGenre: string;
  generatorPresetKeywords: string;
  user: CurrentUser | null;
  setView: (view: ViewKey) => void;
  openCourse: (id: string) => void;
  openScriptGenerator: (preset?: {
    stage?: GeneratorStage;
    movieTitle?: string;
    genre?: string;
    keywords?: string;
  }) => void;
  selectTool: (tool: string) => void;
  setGeneratorPreset: (preset: {
    stage?: GeneratorStage;
    movieTitle?: string;
    genre?: string;
    keywords?: string;
  }) => void;
  clearGeneratorPreset: () => void;
  setUser: (user: CurrentUser | null) => void;
  logout: () => void;
  /** 用户已点击「一键加群」跳转，标记后不再自动弹出加群弹窗 */
  qqGroupJoined: boolean;
  markQqGroupJoined: () => void;
  /** 用户在加群弹窗勾选「不再自动弹出」，标记后跨刷新不再自动弹出（仍可从右下角小浮窗手动打开） */
  qqGroupDismissed: boolean;
  setQqGroupDismissed: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: "pixel-demo",
      selectedCourseId: null,
      selectedTool: null,
      generatorPresetStage: null,
      generatorPresetMovieTitle: "",
      generatorPresetGenre: "",
      generatorPresetKeywords: "",
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
          generatorPresetGenre: preset?.genre ?? "",
          generatorPresetKeywords: preset?.keywords ?? "",
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
          generatorPresetGenre:
            preset.genre ?? state.generatorPresetGenre,
          generatorPresetKeywords:
            preset.keywords ?? state.generatorPresetKeywords,
        })),
      clearGeneratorPreset: () =>
        set({ generatorPresetStage: null, generatorPresetMovieTitle: "", generatorPresetGenre: "", generatorPresetKeywords: "" }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({
          user: null,
          view: "home",
          generatorPresetStage: null,
          generatorPresetMovieTitle: "",
          generatorPresetGenre: "",
          generatorPresetKeywords: "",
        }),
      qqGroupJoined: false,
      markQqGroupJoined: () => set({ qqGroupJoined: true }),
      qqGroupDismissed: false,
      setQqGroupDismissed: (v: boolean) => set({ qqGroupDismissed: v }),
    }),
    {
      name: "yingshu-store",
      version: 3,
      migrate: (persistedState: any, version: number) => {
        // v1 → v2: 清理已删除的视图
        // v2 → v3: 恢复 product/payment/contact 等方案页面 + 修正管理员默认视图
        if (version < 3 && persistedState?.view) {
          const validViews = [
            "home", "courses", "course-detail", "script-generator", "tools",
            "dashboard", "admin", "auth", "workspace", "talk-fengge", "activation",
            "product-home", "cineflow-suite", "ai-copywriting", "hgtts-pro",
            "visual-match", "resources", "payment", "contact", "pixel-demo",
          ];
          if (!validViews.includes(persistedState.view)) {
            persistedState.view = "home";
          }
        }
        return persistedState;
      },
      partialize: (state) => ({
        user: state.user,
        view: state.view,
        selectedCourseId: state.selectedCourseId,
        generatorPresetStage: state.generatorPresetStage,
        generatorPresetMovieTitle: state.generatorPresetMovieTitle,
        generatorPresetGenre: state.generatorPresetGenre,
        generatorPresetKeywords: state.generatorPresetKeywords,
        qqGroupJoined: state.qqGroupJoined,
        qqGroupDismissed: state.qqGroupDismissed,
      }),
    }
  )
);

