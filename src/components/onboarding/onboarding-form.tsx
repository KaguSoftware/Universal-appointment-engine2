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
    <form action={action} className="mx-auto w-full max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Set up your business</h1>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Business name</span>
        <input
          name="businessName"
          required
          minLength={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Choose your type</legend>
        <div className="grid grid-cols-2 gap-2">
          {verticals.map((v, i) => (
            <label
              key={v.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 p-3 text-sm has-[:checked]:border-gray-900 dark:border-gray-600 dark:has-[:checked]:border-white"
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
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-gray-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {pending ? "Creating…" : "Create business"}
      </button>
    </form>
  );
}
