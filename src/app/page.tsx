"use client";

import * as React from "react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { useAppStore } from "@/lib/store";
import { HomeView } from "@/components/views/home-view";
import { CoursesView } from "@/components/views/courses-view";
import { CourseDetailView } from "@/components/views/course-detail-view";
import { ScriptGeneratorView } from "@/components/views/script-generator-view";
import { ToolsView } from "@/components/views/tools-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { AdminView } from "@/components/views/admin-view";
import { AuthView } from "@/components/views/auth-view";
import { WorkspaceView } from "@/components/views/workspace-view";
import { toast } from "sonner";

export default function Page() {
  const view = useAppStore((s) => s.view);
  const setUser = useAppStore((s) => s.setUser);
  const [synced, setSynced] = React.useState(false);

  // Sync session user on mount
  React.useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => {})
      .finally(() => setSynced(true));
  }, [setUser]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {!synced ? (
          <div className="flex h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <React.Suspense
            fallback={
              <div className="flex h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            }
          >
            {view === "home" && <HomeView />}
            {view === "courses" && <CoursesView />}
            {view === "course-detail" && <CourseDetailView />}
            {view === "script-generator" && <ScriptGeneratorView />}
            {view === "tools" && <ToolsView />}
            {view === "dashboard" && <DashboardView />}
            {view === "admin" && <AdminView />}
            {view === "auth" && <AuthView />}
            {view === "workspace" && <WorkspaceView />}
          </React.Suspense>
        )}
      </main>
      <Footer />
    </div>
  );
}
