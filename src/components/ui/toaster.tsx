import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useUIStore, type Toast, type ToastType } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLORS: Record<ToastType, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-info",
  warning: "text-warning",
};

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: number) => void }) {
  const Icon = ICONS[t.type];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "w-80 pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface shadow-xl shadow-black/5 p-3",
        "transition-all duration-200 motion-reduce:transition-none"
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", COLORS[t.type])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">{t.title}</p>
        {t.message && <p className="text-xs text-text-light mt-0.5 break-words">{t.message}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="p-1 rounded-md hover:bg-surface-dark text-text-muted hover:text-text transition-colors duration-200 motion-reduce:transition-none"
        aria-label="Cerrar notificación"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Contenedor global de notificaciones (montado en App). */
export default function Toaster() {
  const { toasts, dismissToast } = useUIStore();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
