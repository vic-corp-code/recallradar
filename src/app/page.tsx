import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Mail,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-svh overflow-hidden bg-background px-5 py-6 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              RecallRadar
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              Receipt recall checks
            </h1>
          </div>
          <ThemeToggle className="w-32" />
        </header>

        <section className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <ScanLine aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              France-first recall safety assistant
            </p>
            <h2 className="mt-4 max-w-3xl text-5xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
              Find risky groceries before they reach the table.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Upload a receipt photo and RecallRadar compares detected products
              with official RappelConso recall data, then tells you exactly what
              needs verification.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-[3.25rem] px-6 text-base" size="lg">
                <Link href="/check">
                  <ScanLine aria-hidden="true" />
                  Check a receipt
                </Link>
              </Button>
              <Button asChild className="h-[3.25rem] px-6 text-base" size="lg" variant="outline">
                <Link href="/sign-in">
                  <Mail aria-hidden="true" />
                  Sign in
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <TrustCue icon={FileSearch} text="Receipt text is reviewed before matching." />
              <TrustCue icon={ShieldCheck} text="Recall data comes from RappelConso." />
              <TrustCue icon={CheckCircle2} text="Matches explain what to verify next." />
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="rounded-[1.5rem] border border-border bg-background p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-primary">Today&apos;s check</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                    1 item needs review
                  </h3>
                </div>
                <div className="rounded-2xl bg-risk/10 p-3 text-risk">
                  <AlertTriangle aria-hidden="true" className="size-6" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <ResultPreview
                  detail="Brand and purchase date look close"
                  label="Ham slices 4x"
                  tone="risk"
                />
                <ResultPreview
                  detail="No active recall found"
                  label="Natural yogurt x4"
                  tone="safe"
                />
                <ResultPreview
                  detail="No active recall found"
                  label="Frozen vegetables"
                  tone="safe"
                />
              </div>
            </div>

            <p className="mt-4 px-2 text-xs leading-5 text-muted-foreground">
              RecallRadar helps you verify. It does not guarantee an exact recall
              match from receipt data alone.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function TrustCue({
  icon: Icon,
  text,
}: {
  icon: typeof CheckCircle2;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <span className="leading-5">{text}</span>
    </div>
  );
}

function ResultPreview({
  detail,
  label,
  tone,
}: {
  detail: string;
  label: string;
  tone: "risk" | "safe";
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <span
        className={
          tone === "risk"
            ? "size-2.5 rounded-full bg-risk"
            : "size-2.5 rounded-full bg-success"
        }
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {detail}
        </span>
      </span>
    </div>
  );
}
