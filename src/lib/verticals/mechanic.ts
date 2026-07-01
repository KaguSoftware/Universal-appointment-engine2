import type { VerticalPreset } from "./types";

export const mechanic: VerticalPreset = {
  id: "mechanic",
  label: "Auto Repair",
  terminology: {
    provider: "Mechanic",
    service: "Service",
    appointment: "Booking",
    customer: "Customer",
  },
  theme: { primary: "#b91c1c", accent: "#f59e0b", icon: "wrench" },
  seedServices: [
    { name: "Oil Change", duration_min: 30, price: 50 },
    { name: "Tire Rotation", duration_min: 30, price: 40 },
    { name: "Brake Inspection", duration_min: 45, price: 60 },
    { name: "Full Service", duration_min: 120, price: 200, buffer_after_min: 15 },
  ],
};
