import type { Metadata } from "next";
import { Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";

export const metadata: Metadata = { title: "Superadmin" };

// Superadmin usa el mismo dashboard layout que el resto
export default function SuperadminLayout({
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
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">
          {children}
        </main>
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}

