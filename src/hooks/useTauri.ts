"use client";

import { useEffect, useState } from "react";

export function useTauri() {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    const checkTauri = async () => {
      // Check for Tauri 2.0 internal variable
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        setIsTauri(true);
      }
    };
    checkTauri();
  }, []);

  return { isTauri };
}
