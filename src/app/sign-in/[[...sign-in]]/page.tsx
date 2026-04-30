import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { hasClerkConfig } from "@/lib/clerk-config";

export default function SignInPage() {
  if (!hasClerkConfig()) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-6 py-12 text-foreground">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Clerk setup needed
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Add your Clerk keys</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Copy `.env.example` to `.env.local`, add your Clerk keys, then
            restart the dev server to use Google, Microsoft, and email sign-in.
          </p>
          <Button asChild className="mt-6 w-full" variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-background px-5 py-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-lg flex-col">
        <header className="flex items-center justify-between">
          <Link className="text-sm font-medium text-muted-foreground" href="/">
            RecallRadar
          </Link>
          <ThemeToggle className="w-32" />
        </header>
        <section className="flex flex-1 flex-col justify-center gap-8 py-10">
          <div>
            <p className="text-sm font-medium text-primary">Secure sign-in</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Check receipts with your RecallRadar profile.
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Use Google, Microsoft, or email to keep your receipt checks,
              flagged items, and verification statuses available.
            </p>
          </div>
          <SignIn />
        </section>
      </div>
    </main>
  );
}
