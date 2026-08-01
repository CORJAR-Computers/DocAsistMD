import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { apiCall } from "@/services/api";
import { USER_ROLE_LABELS } from "@/types/auth";
import type { UserRole } from "@/types/auth";
import { Database, Users, Shield, Loader2, Plus, KeyRound, X } from "lucide-react";

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  status: string;
}

const ROLE_BADGE: Record<string, "default" | "success" | "info" | "secondary"> = {
  admin: "default",
  doctor: "info",
  receptionist: "secondary",
};

export default function Settings() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "receptionist" as UserRole,
  });

  const load = () => {
    setLoading(true);
    apiCall<User[]>("get_users")
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.fullName) {
      setError("Usuario, password y nombre son requeridos.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiCall("create_user", {
        input: {
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          email: form.email || null,
          role: form.role,
        },
      });
      setShowCreate(false);
      setForm({ username: "", password: "", fullName: "", email: "", role: "receptionist" });
      load();
    } catch (err: any) {
      setError(err?.message || "Error al crear el usuario.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Configuracion</h1>
        <p className="text-sm text-text-light mt-1">Ajustes del sistema DocAsistMD</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Database className="w-5 h-5 text-primary" /></div>
            <div><CardTitle>Base de Datos</CardTitle><p className="text-sm text-text-light">FireBird 5.0 Embedded</p></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-text-light">Motor</p><p className="text-sm font-medium text-text">FireBird 5.0 Embedded</p></div>
            <div><p className="text-sm text-text-light">Ubicacion</p><p className="text-sm font-medium text-text font-mono">%APPDATA%/DocAsistMD/</p></div>
            <div><p className="text-sm text-text-light">Modo</p><p className="text-sm font-medium text-success">Embedded (sin servidor)</p></div>
            <div><p className="text-sm text-text-light">Estado</p><p className="text-sm font-medium text-success">Conectado</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center"><Users className="w-5 h-5 text-secondary" /></div>
              <div><CardTitle>Usuarios del Sistema</CardTitle><p className="text-sm text-text-light">Gestion de cuentas y roles</p></div>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showCreate ? "Cancelar" : "Nuevo Usuario"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCreate && (
            <form onSubmit={handleCreate} className="p-4 rounded-xl border border-border bg-surface-dark/30 space-y-3">
              {error && <div className="px-4 py-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Nombre completo *" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                <Input label="Usuario *" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
                <Input label="Password *" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Minimo 6 caracteres" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Rol</label>
                <select
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                >
                  <option value="admin">Administrador</option>
                  <option value="doctor">Medico</option>
                  <option value="receptionist">Recepcionista</option>
                </select>
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" className="gap-1.5" disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  Crear Usuario
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-8 text-text-light">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando usuarios...
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-text-light py-4 text-center">No hay usuarios registrados</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-dark/30 border border-border/50">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {u.fullName?.charAt(0) || u.username?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {u.fullName || u.username}
                      {u.id === currentUser?.id && <span className="ml-2 text-xs text-primary">(tu)</span>}
                    </p>
                    <p className="text-xs text-text-light truncate">@{u.username}{u.email ? ` — ${u.email}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={ROLE_BADGE[u.role] || "secondary"}>{USER_ROLE_LABELS[u.role] || u.role}</Badge>
                    <Badge variant={u.status === "active" ? "success" : "danger"}>
                      {u.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center"><Shield className="w-5 h-5 text-danger" /></div>
            <div><CardTitle>Seguridad</CardTitle><p className="text-sm text-text-light">Proteccion de datos del consultorio</p></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-text-light">Cifrado de password</p><p className="text-sm font-medium text-success">SHA-256</p></div>
            <div><p className="text-sm text-text-light">Auditoria</p><p className="text-sm font-medium text-success">Habilitada (audit_log)</p></div>
            <div><p className="text-sm text-text-light">Sesion</p><p className="text-sm font-medium text-text">Token con expiracion 24h</p></div>
            <div><p className="text-sm text-text-light">Credenciales por defecto</p><p className="text-sm font-medium text-text font-mono">admin / admin123</p></div>
          </div>
          <Separator />
          <p className="text-xs text-text-muted">
            Recuerde cambiar la contrasena por defecto del usuario administrador en produccion.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
