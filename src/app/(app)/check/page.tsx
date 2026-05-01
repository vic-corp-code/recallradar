import { Clock3, ShieldCheck } from "lucide-react";

import { UploadPanel } from "@/components/receipt/upload-panel";

export default function CheckPage() {
  return (
    <div className="space-y-6">
      <UploadPanel />

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

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Clock3 aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold">Recent checks</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Your latest receipt checks will appear here once extraction and
              history are connected.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
