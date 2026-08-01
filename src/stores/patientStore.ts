import { create } from "zustand";
import { patientService } from "@/services/patientService";
import type { Patient, CreatePatientInput, UpdatePatientInput } from "@/types/patient";

interface PatientState {
  patients: Patient[];
  selectedPatient: Patient | null;
  isLoading: boolean;
  searchQuery: string;
  error: string | null;
  fetchPatients: () => Promise<void>;
  setPatients: (patients: Patient[]) => void;
  addPatient: (input: CreatePatientInput) => Promise<Patient | null>;
  updatePatient: (input: UpdatePatientInput) => Promise<Patient | null>;
  deletePatient: (id: string) => Promise<boolean>;
  setSelectedPatient: (patient: Patient | null) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  getFilteredPatients: () => Patient[];
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  selectedPatient: null,
  isLoading: false,
  searchQuery: "",
  error: null,

  fetchPatients: async () => {
    set({ isLoading: true, error: null });
    try {
      const patients = await patientService.getAll();
      set({ patients, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      set({ isLoading: false, error: "Error al cargar pacientes" });
    }
  },

  setPatients: (patients) => set({ patients }),
  addPatient: async (input) => {
    try {
      const patient = await patientService.create(input);
      set((state) => ({ patients: [...state.patients, patient] }));
      return patient;
    } catch (error) {
      console.error("Failed to create patient:", error);
      set({ error: "Error al crear paciente" });
      return null;
    }
  },
  updatePatient: async (input) => {
    try {
      const patient = await patientService.update(input);
      set((state) => ({
        patients: state.patients.map((p) => (p.id === patient.id ? patient : p)),
      }));
      return patient;
    } catch (error) {
      console.error("Failed to update patient:", error);
      set({ error: "Error al actualizar paciente" });
      return null;
    }
  },
  deletePatient: async (id) => {
    try {
      await patientService.delete(id);
      set((state) => ({ patients: state.patients.filter((p) => p.id !== id) }));
      return true;
    } catch (error) {
      console.error("Failed to delete patient:", error);
      set({ error: "Error al eliminar paciente" });
      return false;
    }
  },
  setSelectedPatient: (patient) => set({ selectedPatient: patient }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredPatients: () => {
    const { patients, searchQuery } = get();
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.documentId.includes(q) ||
        p.phone.includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  },
}));
