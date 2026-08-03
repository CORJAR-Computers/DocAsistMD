import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { usePatientStore } from "@/stores/patientStore";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  ClipboardList,
  Pill,
  Receipt,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  Sun,
  Moon,
  MonitorSmartphone,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUIStore, type ThemeMode } from "@/stores/uiStore";
import { canAccess, type ModuleKey } from "@/lib/permissions";
import AboutModal from "@/components/modals/AboutModal";

const navItems: { to: string; icon: typeof LayoutDashboard; label: string; module: ModuleKey }[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", module: "dashboard" },
  { to: "/patients", icon: Users, label: "Pacientes", module: "patients" },
  { to: "/appointments", icon: CalendarDays, label: "Citas", module: "appointments" },
  { to: "/consultations", icon: ClipboardList, label: "Historia Clinica", module: "consultations" },
  { to: "/doctors", icon: Stethoscope, label: "Medicos", module: "doctors" },
  { to: "/medications", icon: Pill, label: "Medicamentos", module: "medications" },
  { to: "/billing", icon: Receipt, label: "Facturacion", module: "billing" },
  { to: "/reports", icon: BarChart3, label: "Reportes", module: "reports" },
  { to: "/audit", icon: ScrollText, label: "Auditoría", module: "audit" },
  { to: "/settings", icon: Settings, label: "Configuracion", module: "settings" },
];

const themeOrder: ThemeMode[] = ["auto", "light", "dark"];

const themeConfig: Record<
  ThemeMode,
  { icon: typeof Sun; label: string; nextLabel: string }
> = {
  auto: { icon: MonitorSmartphone, label: "Tema: Sistema", nextLabel: "Claro" },
  light: { icon: Sun, label: "Tema: Claro", nextLabel: "Oscuro" },
  dark: { icon: Moon, label: "Tema: Oscuro", nextLabel: "Sistema" },
};

export default function MainLayout() {
  const { sidebarCollapsed, toggleSidebar, theme, setTheme } = useUIStore();
  const { user, logout } = useAuthStore();
  const setSearchQuery = usePatientStore((s) => s.setSearchQuery);
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const ThemeIcon = themeConfig[theme].icon;

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim()) {
      setSearchQuery(searchValue.trim());
      navigate("/patients");
      setSearchValue("");
    }
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-white transition-all duration-300 motion-reduce:transition-none ease-in-out",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
          <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight">DocAsistMD</span>
              <span className="text-[10px] text-white/50 uppercase tracking-widest">Gestion Medica</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.filter((item) => canAccess(user?.role, item.module)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 motion-reduce:transition-none",
                  isActive
                    ? "bg-sidebar-active text-white shadow-lg shadow-primary/20"
                    : "text-white/60 hover:bg-sidebar-hover hover:text-white"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-3 space-y-1">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 mb-2 px-2">
              <div className="w-9 h-9 bg-secondary/20 rounded-full flex items-center justify-center text-sm font-semibold text-secondary">
                {user?.fullName?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName || "Usuario"}</p>
                <p className="text-xs text-white/40 truncate">{user?.email || ""}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAbout(true)}
            className="w-full text-white/60 hover:text-white hover:bg-sidebar-hover justify-start"
            title="Acerca de DocAsistMD"
          >
            <Info className="w-4 h-4" />
            {!sidebarCollapsed && <span className="ml-2">Acerca de</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full text-white/60 hover:text-white hover:bg-sidebar-hover justify-start"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span className="ml-2">Cerrar Sesion</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-surface-dark border-b border-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors duration-200 motion-reduce:transition-none text-text-light"
            >
              {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold text-text">Consultorio Medico</h2>
              <p className="text-xs text-text-light">
                {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Botón Acerca de en Header */}
            <button
              type="button"
              onClick={() => setShowAbout(true)}
              title="Acerca de DocAsistMD (Licencia e Información)"
              aria-label="Acerca de DocAsistMD"
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors duration-200 motion-reduce:transition-none text-text-light"
            >
              <Info className="w-5 h-5" />
            </button>

            {/* Toggle de tema: Sistema → Claro → Oscuro */}
            <button
              type="button"
              onClick={() => {
                const next = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];
                setTheme(next);
              }}
              title={`${themeConfig[theme].label} · Click para: ${themeConfig[theme].nextLabel}`}
              aria-label={`${themeConfig[theme].label} · Cambiar a ${themeConfig[theme].nextLabel}`}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors duration-200 motion-reduce:transition-none text-text-light"
            >
              <ThemeIcon className="w-5 h-5" />
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar paciente... (Enter)"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearch}
                className="w-64 h-9 pl-9 pr-4 rounded-lg border border-border bg-surface-dark text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Modal Acerca de */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}

