import { create } from "zustand";
import type { Patient, CreatePatientInput, UpdatePatientInput } from "@/types/patient";

interface PatientState {
  patients: Patient[];
  selectedPatient: Patient | null;
  isLoading: boolean;
  searchQuery: string;
  setPatients: (patients: Patient[]) => void;
  addPatient: (patient: Patient) => void;
  updatePatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;
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

  setPatients: (patients) => set({ patients }),
  addPatient: (patient) => set((state) => ({ patients: [...state.patients, patient] })),
  updatePatient: (patient) =>
    set((state) => ({
      patients: state.patients.map((p) => (p.id === patient.id ? patient : p)),
    })),
  deletePatient: (id) =>
    set((state) => ({ patients: state.patients.filter((p) => p.id !== id) })),
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
        (p.email || "").toLowerCase().includes(q)
    );
  },
}));
