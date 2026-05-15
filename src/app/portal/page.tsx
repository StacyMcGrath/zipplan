import Link from "next/link";

export default function PortalHome() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← Home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Volunteer Portal
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Sign in to see your assignments. Coming soon.
      </p>
    </main>
  );
}
