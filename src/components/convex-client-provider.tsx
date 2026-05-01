"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

import { hasClerkConfig } from "@/lib/clerk-config";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convexUrl) {
    return null;
  }

  if (!convexClient) {
    convexClient = new ConvexReactClient(convexUrl);
  }

  return convexClient;
}

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = getConvexClient();

  if (!client) {
    return <>{children}</>;
  }

  if (hasClerkConfig()) {
    return (
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
