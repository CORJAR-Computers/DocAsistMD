/**
 * Catálogo clínico estandarizado para consultorios médicos en Colombia.
 * Incluye diagnósticos CIE-10 frecuentes en consulta externa y códigos CUPS de atención médica.
 * Cumple con lineamientos de MinSalud y Resolución 948 de 2026 / Res. 2275 de 2023.
 */

export interface Cie10Item {
  code: string;
  name: string;
  category: string;
}

export interface CupsItem {
  code: string;
  name: string;
  type: string;
}

export const CIE10_FREQUENT: Cie10Item[] = [
  // Enfermedades Cardiovasculares y Metabólicas
  { code: "I10", name: "Hipertensión esencial (primaria)", category: "Cardiovascular" },
  { code: "I11.9", name: "Enfermedad cardíaca hipertensiva sin insuficiencia cardíaca", category: "Cardiovascular" },
  { code: "E11.9", name: "Diabetes mellitus tipo 2, sin mención de complicación", category: "Metabólico / Endocrino" },
  { code: "E10.9", name: "Diabetes mellitus tipo 1, sin mención de complicación", category: "Metabólico / Endocrino" },
  { code: "E78.0", name: "Hipercolesterolemia pura", category: "Metabólico / Endocrino" },
  { code: "E78.2", name: "Hiperlipidemia mixta", category: "Metabólico / Endocrino" },
  { code: "E66.9", name: "Obesidad, no especificada", category: "Metabólico / Endocrino" },
  { code: "E03.9", name: "Hipotiroidismo, no especificado", category: "Metabólico / Endocrino" },

  // Respiratorias
  { code: "J00", name: "Rinofaringitis aguda [resfriado común]", category: "Respiratorio" },
  { code: "J02.9", name: "Faringitis aguda, no especificada", category: "Respiratorio" },
  { code: "J03.9", name: "Amigdalitis aguda, no especificada", category: "Respiratorio" },
  { code: "J01.9", name: "Sinusitis aguda, no especificada", category: "Respiratorio" },
  { code: "J20.9", name: "Bronquitis aguda, no especificada", category: "Respiratorio" },
  { code: "J45.9", name: "Asma, no especificada", category: "Respiratorio" },
  { code: "J30.4", name: "Rinitis alérgica, no especificada", category: "Respiratorio" },
  { code: "J18.9", name: "Neumonía, no especificada", category: "Respiratorio" },

  // Digestivas
  { code: "K29.7", name: "Gastritis, no especificada", category: "Digestivo" },
  { code: "K21.9", name: "Enfermedad del reflujo gastroesofágico sin esofagitis", category: "Digestivo" },
  { code: "K30", name: "Dispepsia funcional", category: "Digestivo" },
  { code: "K58.9", name: "Síndrome del colon irritable sin diarrea", category: "Digestivo" },
  { code: "A09", name: "Diarrea y gastroenteritis de presunto origen infeccioso", category: "Digestivo" },
  { code: "K59.0", name: "Constipación / Estreñimiento", category: "Digestivo" },

  // Músculo-esqueléticas
  { code: "M54.5", name: "Lumbago no especificado [Lumbalgia]", category: "Músculo-esquelético" },
  { code: "M54.2", name: "Cervicalgia", category: "Músculo-esquelético" },
  { code: "M25.5", name: "Dolor en articulación [Artralgia]", category: "Músculo-esquelético" },
  { code: "M79.1", name: "Mialgia", category: "Músculo-esquelético" },
  { code: "M19.9", name: "Artrosis, no especificada", category: "Músculo-esquelético" },

  // Sistema Nervioso / Salud Mental
  { code: "G43.9", name: "Migraña, no especificada", category: "Neurológico" },
  { code: "G44.2", name: "Cefalea debida a tensión", category: "Neurológico" },
  { code: "R51", name: "Cefalea / Dolor de cabeza no clasificado", category: "Neurológico" },
  { code: "F41.1", name: "Trastorno de ansiedad generalizada", category: "Salud Mental" },
  { code: "F41.2", name: "Trastorno mixto de ansiedad y depresión", category: "Salud Mental" },
  { code: "F32.9", name: "Episodio depresivo, no especificado", category: "Salud Mental" },
  { code: "G47.0", name: "Trastornos del inicio y del mantenimiento del sueño [insomnio]", category: "Neurológico" },

  // Genitourinario y Dermatológico
  { code: "N39.0", name: "Infección de vías urinarias, sitio no especificado", category: "Genitourinario" },
  { code: "N76.0", name: "Vaginitis aguda", category: "Ginecológico" },
  { code: "N92.6", name: "Menstruación irregular, no especificada", category: "Ginecológico" },
  { code: "L20.9", name: "Dermatitis atópica, no especificada", category: "Dermatología" },
  { code: "L70.0", name: "Acné vulgar", category: "Dermatología" },
  { code: "B35.9", name: "Dermatofitosis, no especificada [Tiña/Hongos]", category: "Dermatología" },

  // Signos, Síntomas Generales y Consulta Preventiva
  { code: "R50.9", name: "Fiebre, no especificada", category: "Síntomas Generales" },
  { code: "R53", name: "Malestar y fatiga", category: "Síntomas Generales" },
  { code: "R10.4", name: "Otros dolores abdominales y los no especificados", category: "Síntomas Generales" },
  { code: "R05", name: "Tos", category: "Síntomas Generales" },
  { code: "Z00.0", name: "Examen médico general [Control preventivo de rutina]", category: "Control y Chequeo" },
  { code: "Z01.0", name: "Examen de ojos y de la visión", category: "Control y Chequeo" },
  { code: "Z30.0", name: "Consejo y asesoramiento general sobre la anticoncepción", category: "Control y Chequeo" },
  { code: "Z76.0", name: "Emisión de receta médica de repetición", category: "Administrativo" },
];

export const CUPS_FREQUENT: CupsItem[] = [
  { code: "890201", name: "Consulta de primera vez por medicina general", type: "Consulta" },
  { code: "890202", name: "Consulta de primera vez por medicina especializada", type: "Consulta" },
  { code: "890301", name: "Consulta de control o seguimiento por medicina general", type: "Consulta" },
  { code: "890302", name: "Consulta de control o seguimiento por medicina especializada", type: "Consulta" },
  { code: "890701", name: "Consulta de urgencias por medicina general", type: "Urgencias" },
  { code: "890101", name: "Atención inicial de urgencias", type: "Urgencias" },
  { code: "890401", name: "Interconsulta médica general", type: "Interconsulta" },
  { code: "890402", name: "Interconsulta médica especializada", type: "Interconsulta" },
  { code: "890105", name: "Teleconsulta de primera vez", type: "Telemedicina" },
  { code: "890106", name: "Teleconsulta de control o seguimiento", type: "Telemedicina" },
];

export const TIPOS_DIAGNOSTICO_RIPS = [
  { id: "1", label: "Impresión diagnóstica" },
  { id: "2", label: "Confirmado nuevo" },
  { id: "3", label: "Confirmado repetido" },
] as const;

export function searchCie10(query: string): Cie10Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return CIE10_FREQUENT.slice(0, 10);
  return CIE10_FREQUENT.filter(
    (item) => item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
  );
}

export function searchCups(query: string): CupsItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return CUPS_FREQUENT;
  return CUPS_FREQUENT.filter(
    (item) => item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
  );
}
