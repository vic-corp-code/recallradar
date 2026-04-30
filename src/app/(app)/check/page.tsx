import { Camera, FileUp, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function CheckPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-medium text-primary">Main flow</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Scan or upload a receipt
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Photo, screenshot, or PDF. Receipt extraction and recall matching will
          connect here next.
        </p>

        <div className="mt-6 grid gap-3">
          <Button className="h-14 justify-start text-base" type="button">
            <Camera aria-hidden="true" />
            Take a receipt photo
          </Button>
          <Button
            className="h-14 justify-start text-base"
            type="button"
            variant="outline"
          >
            <FileUp aria-hidden="true" />
            Choose image or PDF
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-success/15 p-2 text-success">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold">No recent checks yet</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Your receipt checks and verification statuses will appear here
              once the core loop is connected.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
