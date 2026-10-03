import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { USER_ROLE_LABELS, type UserRole } from "@/types/auth";
import { MODULE_LABELS, MODULE_ROLES, type ModuleKey } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";

interface AccessDeniedProps {
  module: ModuleKey;
}

export default function AccessDenied({ module }: AccessDeniedProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const moduleName = MODULE_LABELS[module] || module;
  const allowedRoles = MODULE_ROLES[module] || [];
  const currentRoleLabel = user?.role ? (USER_ROLE_LABELS[user.role as UserRole] || user.role) : "Desconocido";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-surface-dark/60 backdrop-blur-sm p-6 sm:p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto text-danger shadow-inner">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight">
            Acceso Restringido
          </h1>
          <p className="text-sm text-text-light">
            No tienes los privilegios necesarios para ingresar al módulo{" "}
            <span className="font-semibold text-text">{moduleName}</span>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border/70 text-left space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-light font-medium">Tu rol actual:</span>
            <Badge variant="secondary" className="font-medium">
              {currentRoleLabel}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-light font-medium">Roles autorizados:</span>
            <div className="flex flex-wrap gap-1 justify-end">
              {allowedRoles.map((r) => (
                <Badge key={r} variant="default" className="font-medium text-[11px]">
                  {USER_ROLE_LABELS[r] || r}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-text-muted">
          Si requieres acceso a este módulo sensible (reportes, médicos, auditoría o gestión de usuarios),
          solicita los permisos al Administrador del sistema.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            className="flex-1 gap-2"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-text-light hover:text-text"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" /> Cambiar Cuenta
          </Button>
        </div>
      </div>
    </div>
  );
}
