import { AuthForm } from "@/components/auth/auth-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <AuthForm mode="register" next={next} />
    </main>
  );
}
