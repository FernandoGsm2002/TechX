import type { Metadata } from "next";
import { Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { RealtimeProvider } from "@/components/layout/RealtimeProvider";
import { DeudaNotificationsWatcher } from "@/components/layout/DeudaNotificationsWatcher";
import { GettingStartedWidget } from "@/components/ui-custom/GettingStartedWidget";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SidebarProvider defaultOpen>
        <Suspense fallback={<div className="w-64 bg-sidebar shrink-0" />}>
          <AppSidebar />
        </Suspense>
        <SidebarInset className="flex flex-col min-h-svh min-w-0">
          <Header />
          {/* Realtime subscriptions — invisible, activo globalmente */}
          <RealtimeProvider />
          {/* Notificaciones de deudas pendientes — revisa cada 6h */}
          <DeudaNotificationsWatcher />
          {/* Main content: pb en móvil incluye MobileNav (54px); en desktop es p-4 normal */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 pb-[calc(54px+env(safe-area-inset-bottom,0px))] lg:pb-4">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      {/* MobileNav y Widget fuera del SidebarProvider — fixed solo funciona correctamente
          respecto al viewport cuando no hay transform/will-change en un ancestro */}
      <MobileNav />
      <GettingStartedWidget />
    </>
  );
}

