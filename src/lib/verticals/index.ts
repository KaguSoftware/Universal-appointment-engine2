import type { Tenant, Terminology, VerticalId } from "@/lib/types";
import { barbershop } from "./barbershop";
import { dentist } from "./dentist";
import { mechanic } from "./mechanic";
import { therapist } from "./therapist";
import { tutor } from "./tutor";
import type { VerticalPreset } from "./types";

export type { VerticalPreset, SeedService } from "./types";

export const VERTICAL_PRESETS: Record<VerticalId, VerticalPreset> = {
  barbershop,
  dentist,
  tutor,
  therapist,
  mechanic,
};

export const VERTICAL_LIST: VerticalPreset[] = Object.values(VERTICAL_PRESETS);

export function getPreset(vertical: VerticalId): VerticalPreset {
  return VERTICAL_PRESETS[vertical];
}

/**
 * Effective terminology for a tenant: preset defaults overlaid with any
 * per-tenant overrides stored in `tenant.theme.terminology`.
 */
export function resolveTerminology(tenant: Tenant): Terminology {
  const base = getPreset(tenant.vertical).terminology;
  return { ...base, ...(tenant.theme.terminology ?? {}) };
}

/** Effective theme colors for a tenant (preset defaults + overrides). */
export function resolveThemeColors(tenant: Tenant): {
  primary: string;
  accent: string;
} {
  const base = getPreset(tenant.vertical).theme;
  return {
    primary: tenant.theme.primary ?? base.primary,
    accent: tenant.theme.accent ?? base.accent,
  };
}
