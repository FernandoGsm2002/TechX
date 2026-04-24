import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";

// Viewport (tema de color, safe-area)
export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,           // evita zoom accidental en inputs mobile
  userScalable: false,
  viewportFit: "cover",      // iOS notch / home bar support
};

// Metadata
export const metadata: Metadata = {
  title: {
    default: "TechX",
    template: "%s | TechX",
  },
  description:
    "SaaS para talleres de reparación de dispositivos electrónicos. Gestiona tickets, inventario, clientes y finanzas.",
  robots: { index: false, follow: false }, // Private SaaS

  // PWA / App
  manifest: "/manifest.json",
  applicationName: "TechX",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TechX",
    startupImage: [
      { url: "/techxlighmode.png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#0a0a0f",
    "msapplication-tap-highlight": "no",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png",   sizes: "32x32",   type: "image/png" },
      { url: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/icon-192x192.png",
  },
};

// Root Layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Service Worker registration via next/script */}
        <Script id="sw-registration" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(reg) {
                  // When a new SW is waiting, activate it immediately
                  reg.addEventListener('updatefound', function() {
                    var newSW = reg.installing;
                    if (!newSW) return;
                    newSW.addEventListener('statechange', function() {
                      if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                        // New SW ready — skip waiting and reload to activate it
                        newSW.postMessage({ type: 'SKIP_WAITING' });
                      }
                    });
                  });
                }).catch(function(err) { console.log('SW registration failed:', err); });

                // Reload once the new SW has taken control
                var refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  if (!refreshing) { refreshing = true; window.location.reload(); }
                });
              });
            }
          `}
        </Script>
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
