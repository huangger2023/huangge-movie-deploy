﻿"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { VoiceChatEntry } from "@/components/site/voice-chat-entry";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

// 所有视图懒加载，避免 SSR 时编译所有组件导致内存爆炸
const HomeView = dynamic(() => import("@/components/views/home-view").then(m => ({ default: m.HomeView })), { ssr: false });
const CoursesView = dynamic(() => import("@/components/views/courses-view").then(m => ({ default: m.CoursesView })), { ssr: false });
const CourseDetailView = dynamic(() => import("@/components/views/course-detail-view").then(m => ({ default: m.CourseDetailView })), { ssr: false });
const ScriptGeneratorView = dynamic(() => import("@/components/views/script-generator-view").then(m => ({ default: m.ScriptGeneratorView })), { ssr: false });
const ToolsView = dynamic(() => import("@/components/views/tools-view").then(m => ({ default: m.ToolsView })), { ssr: false });
const DashboardView = dynamic(() => import("@/components/views/dashboard-view").then(m => ({ default: m.DashboardView })), { ssr: false });
const AdminView = dynamic(() => import("@/components/views/admin-view").then(m => ({ default: m.AdminView })), { ssr: false });
const AuthView = dynamic(() => import("@/components/views/auth-view").then(m => ({ default: m.AuthView })), { ssr: false });
const WorkspaceView = dynamic(() => import("@/components/views/workspace-view").then(m => ({ default: m.WorkspaceView })), { ssr: false });
const ProductHomeView = dynamic(() => import("@/components/views/product-home-view").then(m => ({ default: m.ProductHomeView })), { ssr: false });
const CineflowSuiteView = dynamic(() => import("@/components/views/cineflow-suite-view").then(m => ({ default: m.CineflowSuiteView })), { ssr: false });
const AiCopywritingView = dynamic(() => import("@/components/views/ai-copywriting-view").then(m => ({ default: m.AiCopywritingView })), { ssr: false });
const HgttsProView = dynamic(() => import("@/components/views/hgtts-pro-view").then(m => ({ default: m.HgttsProView })), { ssr: false });
const VisualMatchView = dynamic(() => import("@/components/views/visual-match-view").then(m => ({ default: m.VisualMatchView })), { ssr: false });
const ResourcesView = dynamic(() => import("@/components/views/resources-view").then(m => ({ default: m.ResourcesView })), { ssr: false });
const PaymentView = dynamic(() => import("@/components/views/payment-view").then(m => ({ default: m.PaymentView })), { ssr: false });
const ContactView = dynamic(() => import("@/components/views/contact-view").then(m => ({ default: m.ContactView })), { ssr: false });
const ActivationView = dynamic(() => import("@/components/views/activation-view").then(m => ({ default: m.ActivationView })), { ssr: false });
const TalkFenggeView = dynamic(() => import("@/components/views/talk-fengge-view").then(m => ({ default: m.TalkFenggeView })), { ssr: false });

export default function Page() {
  const view = useAppStore((s) => s.view);
  const setUser = useAppStore((s) => s.setUser);
  const [synced, setSynced] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);
  const [needsActivation, setNeedsActivation] = React.useState(false);

  // Sync session user on mount + check authorization
  React.useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => {})
      .finally(() => {
        setSynced(true);
        // Check authorization status after user sync
        fetch("/api/authorization")
          .then((r) => r.json())
          .then((d) => {
            if (!d.authRequired || d.activated) {
              // 授权未开启或已激活，不拦截
              setNeedsActivation(false);
            } else if (d.user === null) {
              // 未登录 → 跳转登录页
              useAppStore.setState({ view: "auth" });
              setNeedsActivation(false);
            } else {
              // 已登录但未激活 → 拦截到激活页
              setNeedsActivation(true);
              useAppStore.setState({ view: "activation" });
            }
          })
          .catch(() => {
            // Authorization check failed, allow access
            setNeedsActivation(false);
          })
          .finally(() => setAuthChecked(true));
      });
  }, [setUser]);

  // 授权未开启、或已激活、或正在查看激活/登录页时不拦截
  const blocked = needsActivation && view !== "activation" && view !== "auth";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {!synced || !authChecked ? (
          <div className="flex h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : blocked ? (
          <ActivationView />
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
            {view === "product-home" && <ProductHomeView />}
            {view === "cineflow-suite" && <CineflowSuiteView />}
            {view === "ai-copywriting" && <AiCopywritingView />}
            {view === "hgtts-pro" && <HgttsProView />}
            {view === "visual-match" && <VisualMatchView />}
            {view === "resources" && <ResourcesView />}
            {view === "payment" && <PaymentView />}
            {view === "contact" && <ContactView />}
            {view === "talk-fengge" && <TalkFenggeView />}
            {view === "activation" && <ActivationView />}
            {view === "workspace" && <WorkspaceView />}
          </React.Suspense>
        )}
      </main>
      <VoiceChatEntry />
      <Footer />
      <div id="build-marker" style={{display:"none"}} aria-hidden="true">BUILD_VERSION:20260630-v3</div>
    </div>
  );
}

