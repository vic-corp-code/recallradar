"use client";

import * as React from "react";
import { ClerkProvider } from "@clerk/nextjs";

import { hasClerkConfig } from "@/lib/clerk-config";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!publishableKey || !hasClerkConfig()) {
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
