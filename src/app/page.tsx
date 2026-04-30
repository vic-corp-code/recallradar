import Link from "next/link";
import { CheckCircle2, Mail, ScanLine, ShieldCheck } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-svh bg-background px-5 py-6 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-lg flex-col">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              RecallRadar
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              Receipt recall check
            </h1>
          </div>
          <ThemeToggle className="w-32" />
        </header>

        <section className="flex flex-1 flex-col justify-center py-12">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScanLine aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-primary">
              France-first MVP
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">
              Import a receipt. Check active recalls. Know what to verify.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              RecallRadar compares grocery receipt items with official recall
              data and highlights purchases that may need packaging
              verification.
            </p>

            <div className="mt-8 grid gap-3">
              <Button asChild size="lg">
                <Link href="/sign-in">
                  <Mail aria-hidden="true" />
                  Sign in with Clerk
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sign-up">Create profile</Link>
              </Button>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 size-4 text-primary"
                />
                <span>Google, Microsoft, and email sign-in via Clerk.</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 text-success"
                />
                <span>
                  Results use confidence language: possible match, needs
                  verification, strong match.
                </span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            RecallRadar helps you verify. It does not guarantee an exact recall
            match from receipt data alone.
          </p>
        </section>
      </div>
    </main>
  );
}
