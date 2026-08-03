import { Info, ShieldCheck, Code2, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden">
        {/* Header con gradiente elegante */}
        <div className="px-6 py-6 border-b border-border bg-linear-to-r from-primary/10 via-secondary/10 to-primary/5 text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-secondary p-0.5 mx-auto mb-3 shadow-lg shadow-primary/20">
            <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-text">DocAsistMD</h2>
          <p className="text-xs font-medium text-primary mt-0.5">Software de Gestión Médica e Historias Clínicas</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Badge variant="info" className="text-[11px] px-2.5 py-0.5">Versión 1.0.0</Badge>
            <Badge variant="success" className="text-[11px] px-2.5 py-0.5">Licencia Activa</Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          {/* Información del Desarrollador */}
          <div className="rounded-xl border border-border/80 bg-surface-dark p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Code2 className="w-4 h-4 shrink-0" />
              <span>Desarrollado por</span>
            </div>
            <p className="text-base font-bold text-text pl-6">
              CORJAR Computers Solutions
            </p>
            <p className="text-xs text-text-light pl-6">
              Soluciones Informáticas, Desarrollo de Software & Consultoría Tecnológica.
            </p>
          </div>

          {/* Información de Licencia */}
          <div className="rounded-xl border border-border/80 bg-surface-dark p-4 space-y-2">
            <div className="flex items-center gap-2 text-secondary font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Licencia de Uso</span>
            </div>
            <p className="text-xs text-text-light pl-6 leading-relaxed">
              Este software está protegido por leyes de derechos de autor e internacionales. Licenciado de manera exclusiva para uso en gestión clínica y médica por <strong className="text-text">CORJAR Computers Solutions</strong>.
            </p>
            <p className="text-[11px] text-text-muted pl-6 italic">
              © {new Date().getFullYear()} CORJAR Computers Solutions. Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-dark/50 flex justify-end">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
