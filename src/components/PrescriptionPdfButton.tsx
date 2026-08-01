import { useState } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import { pickExportFolder } from "@/lib/exportDialog";
import { consultationService } from "@/services/consultationService";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  consultationId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
  compact?: boolean;
}

export default function PrescriptionPdfButton({
  consultationId,
  variant = "outline",
  size = "sm",
  compact = false,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ path: string; verificationCode: string } | null>(null);

  const generate = async () => {
    let outDir: string | null;
    try {
      outDir = await pickExportFolder();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo abrir el selector de carpeta.");
      return;
    }
    if (!outDir) return; // usuario canceló el selector
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const res = await consultationService.generatePrescriptionPdf(consultationId, outDir);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "No se pudo generar la receta en PDF.");
    } finally {
      setGenerating(false);
    }
  };

  const open = async () => {
    if (!result) return;
    setOpening(true);
    try {
      await openPath(result.path);
    } catch (err) {
      console.error(err);
      setError("No se pudo abrir el PDF generado.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant={variant}
        size={size}
        className="gap-1.5"
        onClick={generate}
        disabled={generating}
        title="Generar receta médica en PDF con código QR"
      >
        {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        {generating ? "Generando..." : "Receta PDF"}
      </Button>

      {error && (
        <p className="flex items-center gap-1 text-xs text-danger">
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </p>
      )}

      {result && (
        <div className="w-full rounded-lg border border-success/30 bg-success/10 p-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            Receta generada con código QR
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-emerald-600 truncate">
              Código: {result.verificationCode}
            </span>
            <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px] flex-shrink-0" onClick={open} disabled={opening}>
              {opening ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
              Abrir
            </Button>
          </div>
          {!compact && (
            <p className="font-mono text-[10px] text-emerald-600/70 truncate" title={result.path}>
              {result.path}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
