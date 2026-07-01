"use client";

import { useActionState } from "react";
import {
  createTenant,
  type OnboardingState,
} from "@/app/onboarding/actions";
import type { VerticalPreset } from "@/lib/verticals";

const initialState: OnboardingState = {};

export function OnboardingForm({ verticals }: { verticals: VerticalPreset[] }) {
  const [state, action, pending] = useActionState(createTenant, initialState);
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  return (
    <form action={action} className="glass mx-auto w-full max-w-md space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Set up your business</h1>

      <label className="block space-y-1.5">
        <span className="label-text">Business name</span>
        <input name="businessName" required minLength={2} className="field" />
      </label>

      <fieldset className="space-y-2">
        <legend className="label-text">Choose your type</legend>
        <div className="grid grid-cols-2 gap-2">
          {verticals.map((v, i) => (
            <label
              key={v.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border-strong p-3 text-sm transition-colors has-[:checked]:border-brand has-[:checked]:bg-subtle"
            >
              <input
                type="radio"
                name="vertical"
                value={v.id}
                defaultChecked={i === 0}
                required
              />
              {v.label}
            </label>
          ))}
        </div>
      </fieldset>

      <input type="hidden" name="timezone" value={tz} />

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creating…" : "Create business"}
      </button>
    </form>
  );
}
