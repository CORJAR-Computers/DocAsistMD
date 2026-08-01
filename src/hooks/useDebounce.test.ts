import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useDebouncedValue } from "./useDebounce";

describe("useDebouncedValue", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("devuelve el valor inicial de inmediato", () => {
    const { result } = renderHook(() => useDebouncedValue("hola", 300));
    expect(result.current).toBe("hola");
  });

  it("actualiza el valor recién después del delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 300),
      { initialProps: { v: "a" } }
    );
    rerender({ v: "b" });
    expect(result.current).toBe("a"); // antes del delay: valor anterior
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("b");
  });

  it("reinicia el timer si el valor cambia antes de que expire", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 300),
      { initialProps: { v: "a" } }
    );
    rerender({ v: "b" });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    rerender({ v: "c" }); // reinicia el reloj de 300ms
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a"); // a los 299ms del último cambio aún no
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("c");
  });

  it("cancela el timer al desmontar (sin setState tras unmount)", () => {
    vi.useFakeTimers();
    const { result, rerender, unmount } = renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 300),
      { initialProps: { v: "a" } }
    );
    rerender({ v: "b" });
    unmount();
    // Avanzar el tiempo tras el unmount no debe lanzar ni actualizar estado
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }).not.toThrow();
    expect(result.current).toBe("a");
  });

  it("usa el delay por defecto de 300ms cuando no se pasa", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ v }: { v: number }) => useDebouncedValue(v),
      { initialProps: { v: 1 } }
    );
    rerender({ v: 2 });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe(1);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(2);
  });
});
