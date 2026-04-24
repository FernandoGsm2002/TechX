"use client";

import { useEffect } from "react";
import { faTriangleExclamation, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          className="text-destructive text-2xl"
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Ocurrió un error inesperado</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Algo salió mal al cargar esta página. Puedes intentar recargarla o
          contactar soporte si el problema persiste.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Ref: {error.digest}
          </p>
        )}
      </div>

      <Button onClick={reset} variant="outline" className="gap-2">
        <FontAwesomeIcon icon={faRotateRight} className="text-sm" />
        Intentar de nuevo
      </Button>
    </div>
  );
}
