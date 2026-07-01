import type { Terminology, VerticalId } from "@/lib/types";

export interface SeedService {
  name: string;
  description?: string;
  duration_min: number;
  buffer_after_min?: number;
  price: number;
}

export interface VerticalPreset {
  id: VerticalId;
  label: string;
  /** Drives all customer-facing and admin copy. */
  terminology: Terminology;
  theme: {
    primary: string;
    accent: string;
    /** Lucide-style icon name used in the UI. */
    icon: string;
  };
  /** Services created for a new tenant that picks this vertical. */
  seedServices: SeedService[];
}
