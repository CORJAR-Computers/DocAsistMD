import { create } from "zustand";
import { appointmentService } from "@/services/appointmentService";
import type { Appointment, AppointmentStatus, CreateAppointmentInput } from "@/types/appointment";

interface AppointmentState {
  appointments: Appointment[];
  selectedAppointment: Appointment | null;
  isLoading: boolean;
  selectedDate: string;
  selectedStatus: AppointmentStatus | "all";
  fetchAppointments: () => Promise<void>;
  addAppointment: (input: CreateAppointmentInput) => Promise<boolean>;
  updateStatus: (id: string, status: AppointmentStatus) => Promise<boolean>;
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

  fetchAppointments: async () => {
    set({ isLoading: true });
    try {
      const appointments = await appointmentService.getAll();
      set({ appointments, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      set({ isLoading: false });
    }
  },
  addAppointment: async (input) => {
    try {
      await appointmentService.create(input);
      await get().fetchAppointments();
      return true;
    } catch (error) {
      console.error("Failed to create appointment:", error);
      return false;
    }
  },
  updateStatus: async (id, status) => {
    try {
      await appointmentService.updateStatus(id, status);
      set((state) => ({
        appointments: state.appointments.map((a) =>
          a.id === id ? { ...a, status } : a
        ),
      }));
      return true;
    } catch (error) {
      console.error("Failed to update appointment status:", error);
      return false;
    }
  },
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
