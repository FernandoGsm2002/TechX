import { useState, useEffect } from "react";

/**
 * Delays updating a value until the user stops typing.
 * @param value - Value to debounce
 * @param delay - Debounce delay in ms (default 400ms)
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
