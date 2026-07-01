import type { VerticalPreset } from "./types";

export const barbershop: VerticalPreset = {
  id: "barbershop",
  label: "Barbershop",
  terminology: {
    provider: "Barber",
    service: "Service",
    appointment: "Appointment",
    customer: "Client",
  },
  theme: { primary: "#1f2937", accent: "#d97706", icon: "scissors" },
  seedServices: [
    { name: "Haircut", duration_min: 30, price: 25 },
    { name: "Beard Trim", duration_min: 15, price: 15 },
    { name: "Haircut & Beard", duration_min: 45, price: 35 },
    { name: "Kids Cut", duration_min: 20, price: 18 },
  ],
};
