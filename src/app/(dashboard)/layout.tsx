import type { Metadata } from "next";
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
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-svh">
        <Header />
        {/* Realtime subscriptions — invisible, activo globalmente */}
        <RealtimeProvider />
        {/* Main content — padding-bottom accounts for MobileNav on small screens */}
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">
          {children}
        </main>
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
