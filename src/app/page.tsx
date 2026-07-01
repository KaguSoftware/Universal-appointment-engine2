import Link from "next/link";
import { VERTICAL_LIST } from "@/lib/verticals";

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center gap-16 px-6 py-24 text-center">
      <div className="stagger space-y-7">
        <span className="badge mx-auto animate-rise">
          One core · every vertical
        </span>
        <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-7xl">
          One booking engine.
          <br />
          Every business.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted">
          The same reliable calendar core, skinned for your trade. Launch a
          barbershop, dental practice, tutoring service, therapy clinic or auto
          shop in an afternoon.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/auth/register" className="btn-primary">
            Start free
          </Link>
          <Link href="/auth/login" className="btn-ghost">
            Sign in
          </Link>
        </div>
      </div>

      <ul className="stagger grid w-full grid-cols-2 gap-3 sm:grid-cols-5">
        {VERTICAL_LIST.map((v) => (
          <li
            key={v.id}
            className="card sheen group flex flex-col items-center gap-2 p-5 text-sm font-medium transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-float)]"
          >
            <span
              className="h-1.5 w-8 rounded-full transition-all duration-300 group-hover:w-12"
              style={{ backgroundColor: v.theme.accent }}
            />
            {v.label}
          </li>
        ))}
      </ul>
    </main>
  );
}
