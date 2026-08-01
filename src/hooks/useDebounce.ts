import { useEffect, useState } from "react";

/**
 * Devuelve `value` una vez que han pasado `delay` ms sin cambios.
 * Útil para búsquedas/filtros: evita recalcular o llamar al backend en cada tecla.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
