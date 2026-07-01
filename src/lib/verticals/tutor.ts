import type { VerticalPreset } from "./types";

export const tutor: VerticalPreset = {
  id: "tutor",
  label: "Tutoring",
  terminology: {
    provider: "Tutor",
    service: "Lesson",
    appointment: "Session",
    customer: "Student",
  },
  theme: { primary: "#6d28d9", accent: "#a78bfa", icon: "graduation-cap" },
  seedServices: [
    { name: "Math Lesson", duration_min: 60, price: 40 },
    { name: "Language Lesson", duration_min: 60, price: 40 },
    { name: "Exam Prep", duration_min: 90, price: 55 },
    { name: "Trial Session", duration_min: 30, price: 0 },
  ],
};
