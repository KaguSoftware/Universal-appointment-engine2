"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  type AuthState,
  signIn,
  signInWithGoogle,
  signUp,
} from "@/app/auth/actions";

interface Props {
  mode: "login" | "register";
  next?: string;
}

const initialState: AuthState = {};

export function AuthForm({ mode, next }: Props) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isRegister = mode === "register";

  return (
    <div className="glass-float sheen animate-rise mx-auto w-full max-w-sm space-y-6 p-8">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted">
          {isRegister
            ? "Start taking bookings today."
            : "Sign in to your dashboard."}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {isRegister && (
          <Field name="full_name" label="Full name" type="text" required />
        )}
        <Field name="email" label="Email" type="email" required />
        <Field name="password" label="Password" type="password" required />

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? (
            <>
              <span className="spinner" />
              Please wait…
            </>
          ) : isRegister ? (
            "Sign up"
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogle}>
        {next && <input type="hidden" name="next" value={next} />}
        <button type="submit" className="btn-ghost w-full">
          Continue with Google
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-brand-accent">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account?{" "}
            <Link href="/auth/register" className="font-medium text-brand-accent">
              Sign up
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  name,
  label,
  type,
  required,
}: {
  name: string;
  label: string;
  type: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="label-text">{label}</span>
      <input name={name} type={type} required={required} className="field" />
    </label>
  );
}
