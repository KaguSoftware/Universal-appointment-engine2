import Link from "next/link";
import { VERTICAL_LIST } from "@/lib/verticals";

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-12 px-6 py-20 text-center">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          One booking engine. Every business.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          The same reliable calendar core, skinned for your trade. Set up a
          barbershop, dental practice, tutoring service, therapy clinic or auto
          shop in an afternoon.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/auth/register"
            className="rounded-md bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900"
          >
            Start free
          </Link>
          <Link href="/auth/login" className="px-6 py-3 font-medium underline">
            Sign in
          </Link>
        </div>
      </div>

      <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-5">
        {VERTICAL_LIST.map((v) => (
          <li
            key={v.id}
            className="rounded-lg border border-gray-200 p-4 text-sm font-medium dark:border-gray-700"
            style={{ borderTopColor: v.theme.accent, borderTopWidth: 3 }}
          >
            {v.label}
          </li>
        ))}
      </ul>
    </main>
  );
}
