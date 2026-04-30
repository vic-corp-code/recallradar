export default function StoresPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-primary">Stores</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Store preferences
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Preferred, occasional, and unsaved stores will live here once receipt
          extraction starts detecting store names.
        </p>
      </section>

      <div className="grid gap-3">
        {["Preferred", "Occasional", "Do not save"].map((label) => (
          <div
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
            key={label}
          >
            <h3 className="font-semibold">{label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No stores classified yet.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
