import { UserCircle2 } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <UserCircle2 aria-hidden="true" className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Profile</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Account settings
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Clerk account controls will appear from the header avatar once
              Clerk keys are configured.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">Theme</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Choose light, dark, or system mode.
        </p>
        <ThemeToggle className="mt-4 w-full" />
      </section>
    </div>
  );
}
