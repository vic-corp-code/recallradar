import { NextResponse } from "next/server";

import { syncRappelConsoRecalls } from "@/lib/recalls/rappelconso";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}

async function handleSync(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parsePositiveInt(searchParams.get("limit"), 100);
  const offset = parsePositiveInt(searchParams.get("offset"), 0);

  try {
    const result = await syncRappelConsoRecalls({ limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "RappelConso sync failed unexpectedly.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}
