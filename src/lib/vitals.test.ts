import { describe, it, expect } from "vitest";
import { calculateBmi, formatVitalSignsString } from "./vitals";
import { searchCie10, searchCups } from "./colombiaMedicalCatalog";

describe("vitals & BMI calculator", () => {
  it("calculates normal BMI correctly", () => {
    // 70 kg, 175 cm -> 70 / (1.75 * 1.75) = 22.86 -> 22.9
    const res = calculateBmi(70, 175);
    expect(res).not.toBeNull();
    expect(res?.bmi).toBe(22.9);
    expect(res?.category).toBe("Normal");
  });

  it("calculates overweight and obesity categories correctly", () => {
    const overweight = calculateBmi(85, 170); // 85 / 2.89 = 29.4
    expect(overweight?.category).toBe("Sobrepeso");

    const obesity1 = calculateBmi(95, 170); // 95 / 2.89 = 32.9
    expect(obesity1?.category).toBe("Obesidad Clase I");

    const underweight = calculateBmi(45, 165); // 45 / 2.7225 = 16.5
    expect(underweight?.category).toBe("Bajo peso");
  });

  it("returns null for invalid inputs", () => {
    expect(calculateBmi(0, 170)).toBeNull();
    expect(calculateBmi(70, 0)).toBeNull();
    expect(calculateBmi(undefined, undefined)).toBeNull();
  });

  it("formats vital signs to a complete clinical string", () => {
    const str = formatVitalSignsString({
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
      respiratoryRate: 18,
      temperature: 36.5,
      oxygenSaturation: 98,
      weightKg: 70,
      heightCm: 175,
    });
    expect(str).toContain("PA: 120/80 mmHg");
    expect(str).toContain("FC: 72 lpm");
    expect(str).toContain("Temp: 36.5°C");
    expect(str).toContain("SpO2: 98%");
    expect(str).toContain("IMC: 22.9 kg/m² (Normal)");
  });
});

describe("colombiaMedicalCatalog", () => {
  it("searches CIE-10 by code or name", () => {
    const hypertension = searchCie10("I10");
    expect(hypertension.length).toBeGreaterThan(0);
    expect(hypertension[0].code).toBe("I10");

    const diabetes = searchCie10("diabetes");
    expect(diabetes.length).toBeGreaterThan(0);
    expect(diabetes.some(d => d.code.startsWith("E1"))).toBe(true);
  });

  it("searches CUPS procedures", () => {
    const consults = searchCups("890201");
    expect(consults.length).toBe(1);
    expect(consults[0].name).toContain("medicina general");
  });
});
