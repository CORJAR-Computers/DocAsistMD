import { useState } from "react";
import { X, FileText, Printer, Calendar, User, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/types/patient";

interface Props {
  patient: Patient;
  doctorName?: string;
  doctorLicense?: string;
  doctorSpecialty?: string;
  defaultDiagnosis?: string;
  defaultCie10?: string;
  onClose: () => void;
}

const NUMBER_WORDS: Record<number, string> = {
  1: "un",
  2: "dos",
  3: "tres",
  4: "cuatro",
  5: "cinco",
  6: "seis",
  7: "siete",
  8: "ocho",
  9: "nueve",
  10: "diez",
  15: "quince",
  20: "veinte",
  30: "treinta",
};

export default function MedicalDisabilityModal({
  patient,
  doctorName = "Médico Tratante",
  doctorLicense = "Reg. Médico No. 12345",
  doctorSpecialty = "Medicina General",
  defaultDiagnosis = "",
  defaultCie10 = "",
  onClose,
}: Props) {
  const [days, setDays] = useState<number>(3);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<"inicial" | "prorroga">("inicial");
  const [diagnosis, setDiagnosis] = useState(defaultDiagnosis || "Enfermedad común");
  const [cie10, setCie10] = useState(defaultCie10 || "Z00.0");
  const [notes, setNotes] = useState(
    "Reposo absoluto en casa, hidratación abundante y cumplir con el tratamiento farmacológico prescrito."
  );

  // Calcular fecha de fin
  const endDate = (() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + Math.max(0, days - 1));
    return d.toISOString().slice(0, 10);
  })();

  const daysWord = NUMBER_WORDS[days] || `${days}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-linear-to-r from-primary/5 to-secondary/5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Certificado de Incapacidad Médica</h2>
              <p className="text-xs text-text-light">Emisión oficial para el paciente (Colombia)</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-light hover:text-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Controls (hidden on print) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-border bg-surface-dark/30 print:hidden">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Días de Incapacidad</label>
              <input
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                className="form-input text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Fecha de Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Tipo de Incapacidad</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "inicial" | "prorroga")}
                className="form-input text-xs"
              >
                <option value="inicial">Inicial</option>
                <option value="prorroga">Prórroga</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-text-light mb-1">Diagnóstico</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="form-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">CIE-10</label>
              <input
                type="text"
                value={cie10}
                onChange={(e) => setCie10(e.target.value.toUpperCase())}
                className="form-input text-xs font-mono uppercase"
              />
            </div>
          </div>

          {/* Printable Document Sheet */}
          <div className="p-8 border border-border/80 rounded-xl bg-white text-gray-900 shadow-sm space-y-6 text-sm">
            <div className="border-b border-gray-200 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">CERTIFICADO DE INCAPACIDAD MÉDICA</h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">República de Colombia — Sector Salud</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Fecha de emisión: {new Date().toLocaleDateString("es-CO", { dateStyle: "long" })}</p>
                <p className="font-semibold text-gray-700 uppercase">{type === "inicial" ? "Incapacidad Inicial" : "Prórroga"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div>
                <p className="text-gray-500">Paciente:</p>
                <p className="font-bold text-gray-900 text-sm">{patient.firstName} {patient.lastName}</p>
                <p className="text-gray-600">Doc: {patient.documentType} {patient.documentId}</p>
              </div>
              <div>
                <p className="text-gray-500">Médico Tratante:</p>
                <p className="font-bold text-gray-900 text-sm">Dr(a). {doctorName}</p>
                <p className="text-gray-600">{doctorSpecialty} — {doctorLicense}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="leading-relaxed">
                Por medio de la presente se certifica que el/la paciente mencionado(a) presenta cuadro clínico correspondiente a:{" "}
                <strong className="text-gray-900">{diagnosis}</strong> (Código CIE-10: <span className="font-mono">{cie10}</span>),
                por lo cual requiere reposo médico y aislamiento laboral/escolar por un periodo de:
              </p>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-2xl font-bold text-blue-950 tabular-nums">
                  {days} ({daysWord}) DÍAS
                </span>
                <p className="text-xs text-blue-800 mt-1">
                  Desde el <strong>{startDate}</strong> hasta el <strong>{endDate}</strong> (inclusive).
                </p>
              </div>

              {notes && (
                <div className="text-xs text-gray-600 border-l-2 border-gray-300 pl-3">
                  <span className="font-semibold text-gray-700">Recomendaciones: </span>
                  {notes}
                </div>
              )}
            </div>

            <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="border-t border-gray-300 pt-2">
                <p className="font-bold text-gray-900">Dr(a). {doctorName}</p>
                <p className="text-gray-500">{doctorLicense}</p>
                <p className="text-gray-400 text-[10px]">Firma y Registro Profesional</p>
              </div>
              <div className="border-t border-gray-300 pt-2">
                <p className="font-bold text-gray-900">{patient.firstName} {patient.lastName}</p>
                <p className="text-gray-500">{patient.documentType} {patient.documentId}</p>
                <p className="text-gray-400 text-[10px]">Firma Paciente / Recibido</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface-dark/20 print:hidden">
          <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
          <Button type="button" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Imprimir Incapacidad
          </Button>
        </div>
      </div>
    </div>
  );
}
