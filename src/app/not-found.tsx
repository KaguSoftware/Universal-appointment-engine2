import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-gray-600 dark:text-gray-300">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="underline">
        Go home
      </Link>
    </main>
  );
}
