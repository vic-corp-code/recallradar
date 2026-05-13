"use client";

import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Bell, UserCircle2 } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { hasClerkConfig } from "@/lib/clerk-config";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <Link href="/check" className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            RecallRadar
          </p>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            Check your receipt
          </h1>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden w-32 sm:grid" />
          <Button
            aria-label="Notifications"
            className="hidden text-muted-foreground sm:inline-flex"
            size="icon"
            type="button"
            variant="ghost"
          >
            <Bell aria-hidden="true" />
          </Button>
          <AuthAvatar />
        </div>
      </div>
    </header>
  );
}

function AuthAvatar() {
  if (!hasClerkConfig()) {
    return (
      <Button
        aria-label="Profile"
        className="text-muted-foreground"
        size="icon"
        type="button"
        variant="outline"
      >
        <UserCircle2 aria-hidden="true" />
      </Button>
    );
  }

  return (
    <>
      <Show when="signed-in">
        <UserButton />
      </Show>
      <Show when="signed-out">
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <Button size="sm" variant="ghost">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button className="hidden sm:inline-flex" size="sm">
              Create profile
            </Button>
          </SignUpButton>
        </div>
      </Show>
    </>
  );
}
