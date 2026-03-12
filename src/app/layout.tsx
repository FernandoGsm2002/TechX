import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "TechX — Gestión de Servicio Técnico",
    template: "%s | TechX",
  },
  description:
    "ERP SaaS para talleres de reparación de dispositivos electrónicos. Gestiona tickets, inventario, clientes y finanzas.",
  robots: { index: false, follow: false }, // Private SaaS
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
