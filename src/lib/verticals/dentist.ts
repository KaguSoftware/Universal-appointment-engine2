import type { VerticalPreset } from "./types";

export const dentist: VerticalPreset = {
  id: "dentist",
  label: "Dental Practice",
  terminology: {
    provider: "Dentist",
    service: "Treatment",
    appointment: "Appointment",
    customer: "Patient",
  },
  theme: { primary: "#0e7490", accent: "#06b6d4", icon: "tooth" },
  seedServices: [
    { name: "Check-up", duration_min: 30, price: 60 },
    { name: "Cleaning", duration_min: 45, price: 90, buffer_after_min: 10 },
    { name: "Filling", duration_min: 60, price: 150, buffer_after_min: 10 },
    { name: "Consultation", duration_min: 20, price: 40 },
  ],
};
