import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <p className="text-6xl font-semibold text-faint">404</p>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-muted">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="btn-ghost mt-2">
        Go home
      </Link>
    </main>
  );
}
