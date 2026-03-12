import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPERADMIN_EMAIL = "fernandoapple2002@gmail.com";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  // Siempre refresca la sesión ANTES de leer el usuario
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── 1. Rutas siempre públicas ──────────────────────────────
  const publicPaths = ["/login", "/register", "/auth/callback", "/pending"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    // Autenticado intentando ir a login/register → llevar al dashboard
    if (user && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  // ── 2. Sin sesión → login ──────────────────────────────────
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── 3. Superadmin → acceso total ───────────────────────────
  if (user.email === SUPERADMIN_EMAIL) {
    return supabaseResponse;
  }

  // ── 4. Verificar aprobación de org (usando JWT del usuario) ─
  // El cliente ya tiene el JWT en las cookies, RLS usa auth.uid()
  // correctamente para filtrar la organización del usuario.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  // Leer org — RLS permitirá al usuario leer su propia org via member_select_own_organization
  const { data: org } = await supabase
    .from("organizations")
    .select("is_approved, is_active, subscription_end")
    .eq("id", profile.organization_id)
    .single();

  // Sin org o no aprobada/activa → pending
  if (!org || !org.is_approved || !org.is_active) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  // Suscripción expirada → pending
  if (org.subscription_end) {
    const expired = new Date(org.subscription_end) < new Date();
    if (expired) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
  }

  // ── 5. Rutas exclusivas para admin+ ───────────────────────
  // Técnicos NO pueden acceder a ingresos ni configuración
  // Técnicos SÍ pueden acceder a: tickets, clientes, pos, inventario, gastos, perfil
  const adminOnlyPaths = [
    "/finanzas/ingresos",
    "/finanzas/reportes",
    "/configuracion",
  ];
  if (adminOnlyPaths.some((p) => pathname.startsWith(p))) {
    if (profile.role === "tecnico") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
