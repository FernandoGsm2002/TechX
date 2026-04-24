import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Metadata } from "next";
import Image from "next/image";
import { DemoCard } from "./DemoCard";

export const metadata: Metadata = { title: "Iniciar Sesión | TechX" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  const params = await searchParams;
  const showDemo  = params.demo === "1";
  const authError = params.error;

  return (
    <div className="min-h-svh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/techxlighmode.png"
            alt="TechX"
            width={200}
            height={60}
            priority
            className="object-contain h-16 w-auto mix-blend-multiply dark:mix-blend-normal dark:invert"
          />
          <p className="text-sm text-muted-foreground">
            Gestión de Servicio Técnico
          </p>
        </div>

        {/* Demo card — shown when ?demo=1 or always as a subtle option */}
        {showDemo && (
          <div>
            <p className="text-center text-xs text-muted-foreground mb-3">
              Usa las credenciales de abajo para explorar la plataforma
            </p>
            <DemoCard />
          </div>
        )}

        {/* Login form */}
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresa tu correo y contraseña para acceder
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                {authError === "Invalid login credentials"
                  ? "Correo o contraseña incorrectos"
                  : authError}
              </div>
            )}
            <form action="/auth/callback" method="POST" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tecnico@taller.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Ingresar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo subtle link (always visible) */}
        {!showDemo && (
          <p className="text-center text-xs text-muted-foreground">
            ¿Quieres explorar sin registrarte?{" "}
            <Link href="/login?demo=1" className="text-primary hover:underline font-medium">
              Probar versión demo
            </Link>
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Solicita una aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
