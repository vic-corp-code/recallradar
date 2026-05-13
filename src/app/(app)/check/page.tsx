import { Clock3, FileCheck2, SearchCheck, ShieldCheck } from "lucide-react";

import { UploadPanel } from "@/components/receipt/upload-panel";

export default function CheckPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <div className="space-y-6">
        <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Main flow
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Check a receipt against active recalls.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Upload a clear receipt photo, review the extracted products, then
            let RecallRadar flag anything that needs package-level verification.
          </p>
        </section>

        <UploadPanel />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-success/15 p-2 text-success">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold">What happens next</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                You stay in control: extraction is reviewed before recall
                matching, and every alert explains what to verify.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Step icon={FileCheck2} label="1. Read receipt" />
            <Step icon={SearchCheck} label="2. Match recalls" />
            <Step icon={ShieldCheck} label="3. Verify risky items" />
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-muted p-2 text-muted-foreground">
              <Clock3 aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold">Recent checks</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Completed receipt checks are saved to history when Convex is
                connected, including verification status updates.
              </p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

function Step({
  icon: Icon,
  label,
}: {
  icon: typeof FileCheck2;
  label: string;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-background px-3 text-sm font-medium">
      <Icon aria-hidden="true" className="size-4 text-primary" />
      {label}
    </div>
  );
}
