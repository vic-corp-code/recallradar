const statuses = ["All", "To verify", "Affected", "Verified safe", "Ignored"];

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-primary">History</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Past receipt checks
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This tab will list imported receipts, flagged items, and saved
          verification statuses.
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {statuses.map((status) => (
          <button
            className="min-h-11 shrink-0 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground first:bg-accent first:text-accent-foreground"
            key={status}
            type="button"
          >
            {status}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
        No receipt history yet.
      </div>
    </div>
  );
}
