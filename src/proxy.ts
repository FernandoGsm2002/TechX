import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? "";

/** Fetch con timeout para que el middleware no cuelgue si Supabase no responde */
function fetchWithTimeout(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(input, { ...init, signal: controller.signal }).finally(() =>
      clearTimeout(id)
    );
  };
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchWithTimeout(5000) },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // ── 1. Rutas siempre públicas ──────────────────────────────
  const publicPaths = ["/login", "/register", "/auth/callback", "/pending", "/track", "/api/track", "/tutoriales"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return supabaseResponse;
  }

  // ── 2. Obtener sesión con timeout protegido ────────────────
  let user: { id: string; email?: string } | null = null;
  try {
    const {
      data: { user: u },
      error,
    } = await supabase.auth.getUser();

    // Refresh token inválido o expirado: limpiar cookies y redirigir
    if (
      error &&
      (error.message?.toLowerCase().includes("refresh token") ||
        (error as { code?: string }).code === "refresh_token_not_found")
    ) {
      const loginUrl = new URL("/login", request.url);
      const cleanResponse = NextResponse.redirect(loginUrl);
      // Borrar todas las cookies que comienzan con sb- (sesión de Supabase)
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith("sb-")) {
          cleanResponse.cookies.delete(name);
        }
      });
      return cleanResponse;
    }

    user = u;
  } catch {
    // Supabase no disponible — redirigir a login para no exponer el dashboard
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Landing pública en raíz
  if (pathname === "/") {
    if (user) return NextResponse.redirect(new URL("/inicio", request.url));
    return supabaseResponse;
  }

  // ── 3. Sin sesión → login ──────────────────────────────────
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── 4. Superadmin → acceso total ───────────────────────────
  if (user.email === SUPERADMIN_EMAIL) {
    return supabaseResponse;
  }

  // ── 5. Verificar aprobación de org ────────────────────────
  let profile: { role: string; organization_id: string | null } | null = null;
  let org: { is_approved: boolean; is_active: boolean; subscription_end: string | null } | null = null;

  try {
    const { data: p } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();
    profile = p;

    if (profile?.organization_id) {
      const { data: o } = await supabase
        .from("organizations")
        .select("is_approved, is_active, subscription_end")
        .eq("id", profile.organization_id)
        .single();
      org = o;
    }
  } catch {
    // Si la DB no responde pero el usuario tiene sesión válida,
    // dejar pasar para no bloquear la app.
    return supabaseResponse;
  }

  if (!profile?.organization_id) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  if (!org || !org.is_approved || !org.is_active) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  if (org.subscription_end) {
    const expired = new Date(org.subscription_end) < new Date();
    if (expired) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
  }

  // ── 6. Rutas exclusivas para superadmin ───────────────────
  if (pathname.startsWith("/superadmin")) {
    return NextResponse.redirect(new URL("/inicio", request.url));
  }

  // ── 7. Rutas exclusivas para admin+ ───────────────────────
  const adminOnlyPaths = [
    "/finanzas/ingresos",
    "/finanzas/reportes",
    "/configuracion",
  ];
  if (adminOnlyPaths.some((p) => pathname.startsWith(p))) {
    if (profile.role === "tecnico") {
      return NextResponse.redirect(new URL("/inicio", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
