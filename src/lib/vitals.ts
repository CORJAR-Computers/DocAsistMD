/**
 * Utilidades para signos vitales y cálculo automático del Índice de Masa Corporal (IMC)
 * según estándares de la Organización Mundial de la Salud (OMS) y Ministerio de Salud de Colombia.
 */

export interface VitalSignsData {
  systolic?: number | string; // mmHg
  diastolic?: number | string; // mmHg
  heartRate?: number | string; // lpm / bpm
  respiratoryRate?: number | string; // rpm
  temperature?: number | string; // °C
  oxygenSaturation?: number | string; // % SpO2
  weightKg?: number | string; // kg
  heightCm?: number | string; // cm
}

export interface BmiResult {
  bmi: number;
  category: string;
  badgeClass: string;
  description: string;
}

/**
 * Calcula el Índice de Masa Corporal (IMC = peso / (altura_m)^2)
 */
export function calculateBmi(weightKg: number | string | undefined, heightCm: number | string | undefined): BmiResult | null {
  const w = typeof weightKg === "string" ? parseFloat(weightKg) : weightKg;
  const h = typeof heightCm === "string" ? parseFloat(heightCm) : heightCm;

  if (!w || !h || w <= 0 || h <= 0) return null;

  const heightM = h / 100;
  const bmi = Number((w / (heightM * heightM)).toFixed(1));

  if (bmi < 18.5) {
    return {
      bmi,
      category: "Bajo peso",
      badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300",
      description: "Peso inferior al rango saludable recomendado",
    };
  } else if (bmi <= 24.9) {
    return {
      bmi,
      category: "Normal",
      badgeClass: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300",
      description: "Peso adecuado para la estatura",
    };
  } else if (bmi <= 29.9) {
    return {
      bmi,
      category: "Sobrepeso",
      badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300",
      description: "Sobrepeso (Pre-obesidad)",
    };
  } else if (bmi <= 34.9) {
    return {
      bmi,
      category: "Obesidad Clase I",
      badgeClass: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300",
      description: "Riesgo moderado para la salud",
    };
  } else if (bmi <= 39.9) {
    return {
      bmi,
      category: "Obesidad Clase II",
      badgeClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300",
      description: "Riesgo severo para la salud",
    };
  } else {
    return {
      bmi,
      category: "Obesidad Clase III (Mórbida)",
      badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300",
      description: "Riesgo muy alto / Obesidad mórbida",
    };
  }
}

/**
 * Formatea los signos vitales estructurados a una cadena clínica legible
 */
export function formatVitalSignsString(data: VitalSignsData): string {
  const parts: string[] = [];

  if (data.systolic && data.diastolic) {
    parts.push(`PA: ${data.systolic}/${data.diastolic} mmHg`);
  } else if (data.systolic) {
    parts.push(`PA Sistólica: ${data.systolic} mmHg`);
  }

  if (data.heartRate) {
    parts.push(`FC: ${data.heartRate} lpm`);
  }

  if (data.respiratoryRate) {
    parts.push(`FR: ${data.respiratoryRate} rpm`);
  }

  if (data.temperature) {
    parts.push(`Temp: ${data.temperature}°C`);
  }

  if (data.oxygenSaturation) {
    parts.push(`SpO2: ${data.oxygenSaturation}%`);
  }

  if (data.weightKg) {
    parts.push(`Peso: ${data.weightKg} kg`);
  }

  if (data.heightCm) {
    parts.push(`Talla: ${data.heightCm} cm`);
  }

  const bmiRes = calculateBmi(data.weightKg, data.heightCm);
  if (bmiRes) {
    parts.push(`IMC: ${bmiRes.bmi} kg/m² (${bmiRes.category})`);
  }

  return parts.join(", ");
}
