"use client";

import { useRouter } from "next/navigation";

interface DemoButtonProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function DemoButton({ className, style, children }: DemoButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/login?demo=1")}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        cursor: "pointer",
        border: "none",
        ...style,
      }}
    >
      {children ?? "Probar Demo Ahora →"}
    </button>
  );
}
