import type { VerticalPreset } from "./types";

export const therapist: VerticalPreset = {
  id: "therapist",
  label: "Therapy Practice",
  terminology: {
    provider: "Therapist",
    service: "Service",
    appointment: "Session",
    customer: "Client",
  },
  theme: { primary: "#047857", accent: "#34d399", icon: "heart-pulse" },
  seedServices: [
    { name: "Initial Assessment", duration_min: 60, price: 120 },
    { name: "Therapy Session", duration_min: 50, price: 100, buffer_after_min: 10 },
    { name: "Couples Session", duration_min: 80, price: 150, buffer_after_min: 10 },
  ],
};
