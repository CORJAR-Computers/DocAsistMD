import { create } from "zustand";
import type { Appointment, AppointmentStatus } from "@/types/appointment";

interface AppointmentState {
  appointments: Appointment[];
  selectedAppointment: Appointment | null;
  isLoading: boolean;
  selectedDate: string;
  selectedStatus: AppointmentStatus | "all";
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (appointment: Appointment) => void;
  deleteAppointment: (id: string) => void;
  updateStatus: (id: string, status: AppointmentStatus) => void;
  setSelectedAppointment: (appointment: Appointment | null) => void;
  setLoading: (loading: boolean) => void;
  setSelectedDate: (date: string) => void;
  setSelectedStatus: (status: AppointmentStatus | "all") => void;
  getFilteredAppointments: () => Appointment[];
  getTodayAppointments: () => Appointment[];
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  selectedAppointment: null,
  isLoading: false,
  selectedDate: new Date().toISOString().split("T")[0],
  selectedStatus: "all",

  setAppointments: (appointments) => set({ appointments }),
  addAppointment: (appointment) =>
    set((state) => ({ appointments: [...state.appointments, appointment] })),
  updateAppointment: (appointment) =>
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === appointment.id ? appointment : a
      ),
    })),
  deleteAppointment: (id) =>
    set((state) => ({ appointments: state.appointments.filter((a) => a.id !== id) })),
  updateStatus: (id, status) =>
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, status } : a
      ),
    })),
  setSelectedAppointment: (appointment) => set({ selectedAppointment: appointment }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),

  getFilteredAppointments: () => {
    const { appointments, selectedDate, selectedStatus } = get();
    return appointments.filter((a) => {
      const dateMatch = a.dateTime.startsWith(selectedDate);
      const statusMatch = selectedStatus === "all" || a.status === selectedStatus;
      return dateMatch && statusMatch;
    });
  },

  getTodayAppointments: () => {
    const today = new Date().toISOString().split("T")[0];
    return get().appointments.filter((a) => a.dateTime.startsWith(today));
  },
}));
