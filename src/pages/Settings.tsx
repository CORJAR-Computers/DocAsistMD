import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Database, Bell, Shield, User, Palette } from "lucide-react";

export default function Settings() {
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
            <div><p className="text-sm text-text-light">Estado</p><p className="text-sm font-medium text-success">Conectado</p></div>
            <div><p className="text-sm text-text-light">Ubicacion</p><p className="text-sm font-medium text-text font-mono">/data/docasistmd.fdb</p></div>
            <div><p className="text-sm text-text-light">Ultimo Backup</p><p className="text-sm font-medium text-text">2026-08-01 03:00</p></div>
          </div>
          <Separator />
          <div className="flex gap-3">
            <Button variant="outline" size="sm">Ejecutar Backup</Button>
            <Button variant="outline" size="sm">Verificar Integridad</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center"><Bell className="w-5 h-5 text-secondary" /></div>
            <div><CardTitle>Notificaciones</CardTitle><p className="text-sm text-text-light">Recordatorios y alertas automaticas</p></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-text">Recordatorio de cita (24h)</p><p className="text-xs text-text-light">Enviar SMS y email 24 horas antes</p></div>
            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" defaultChecked className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div></label>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-text">Recordatorio de cita (2h)</p><p className="text-xs text-text-light">Enviar SMS 2 horas antes</p></div>
            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" defaultChecked className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div></label>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-text">Alerta de stock bajo</p><p className="text-xs text-text-light">Notificar cuando medicamentos esten por debajo del minimo</p></div>
            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" defaultChecked className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div></label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center"><Shield className="w-5 h-5 text-danger" /></div>
            <div><CardTitle>Seguridad</CardTitle><p className="text-sm text-text-light">Cumplimiento HIPAA y proteccion de datos</p></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-text-light">Cifrado</p><p className="text-sm font-medium text-success">AES-256-GCM Activo</p></div>
            <div><p className="text-sm text-text-light">Auditoria</p><p className="text-sm font-medium text-success">Habilitada</p></div>
            <div><p className="text-sm text-text-light">Autenticacion</p><p className="text-sm font-medium text-text">JWT + MFA Opcional</p></div>
            <div><p className="text-sm text-text-light">Ultima auditoria</p><p className="text-sm font-medium text-text">2026-07-15</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
