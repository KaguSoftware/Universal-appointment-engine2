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
    <div className="mx-auto w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">
        {isRegister ? "Create your account" : "Sign in"}
      </h1>

      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {isRegister && (
          <Field name="full_name" label="Full name" type="text" required />
        )}
        <Field name="email" label="Email" type="email" required />
        <Field name="password" label="Password" type="password" required />

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
          {pending ? "Please wait…" : isRegister ? "Sign up" : "Sign in"}
        </button>
      </form>

      <form action={signInWithGoogle}>
        {next && <input type="hidden" name="next" value={next} />}
        <button
          type="submit"
          className="w-full rounded-md border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          Continue with Google
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/auth/login" className="underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account?{" "}
            <Link href="/auth/register" className="underline">
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
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
      />
    </label>
  );
}
