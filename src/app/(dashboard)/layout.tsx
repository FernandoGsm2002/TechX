import type { Metadata } from "next";
import { Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { RealtimeProvider } from "@/components/layout/RealtimeProvider";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      <Suspense fallback={<div className="w-64 bg-sidebar shrink-0" />}>
        <AppSidebar />
      </Suspense>
      <SidebarInset className="flex flex-col min-h-svh">
        <Header />
        {/* Realtime subscriptions — invisible, activo globalmente */}
        <RealtimeProvider />
        {/* Main content — padding-bottom accounts for MobileNav on small screens */}
        <main
          className="flex-1 overflow-auto p-4 md:pb-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)" }}
        >
          {children}
        </main>
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}

