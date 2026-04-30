import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-5">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
