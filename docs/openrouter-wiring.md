# OpenRouter Wiring

RecallRadar uses OpenRouter as the primary AI provider for receipt extraction. The integration wraps OpenRouter's API through the Vercel AI SDK (`ai`) with structured output (Zod schema).

## Dependencies

- `@openrouter/ai-sdk-provider` (v2.9.0) — OpenRouter provider for the AI SDK
- `ai` (v6.0.180) — Vercel AI SDK with `generateText` and structured output
- `zod` (v4.4.3) — Schema validation for structured output

## How It Works

### 1. OpenRouter Client

Created in `src/lib/receipts/extract.ts`:

```ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
```

The client uses the `OPENROUTER_API_KEY` environment variable. There is no base URL override — it uses the default OpenRouter endpoint.

### 2. Model Selection

The model is set to `openrouter/auto` (auto-routing):

```ts
model: openrouter("openrouter/auto")
```

OpenRouter auto-routing selects the best available model for the task. This can be overridden via the `OPENROUTER_RECEIPT_MODEL` environment variable (not currently wired in code, but documented in README and `.env.example` with a default of `google/gemma-4-31b-it:free`).

### 3. Structured Output via AI SDK

Extraction uses `generateText` with `Output.object`:

```ts
const receiptSchema = z.object({
  storeName: z.string().nullable(),
  storeLocation: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  lineItems: z.array(z.object({
    name: z.string(),
    brand: z.string().nullable(),
    quantity: z.number().nullable(),
    price: z.number().nullable(),
  })),
});

const { output } = await generateText({
  model: openrouter("openrouter/auto"),
  temperature: 0,
  output: Output.object({ schema: receiptSchema }),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: RECEIPT_PROMPT },
        { type: "image", image: buffer, mediaType: file.type },
      ],
    },
  ],
});
```

Key details:
- `temperature: 0` — deterministic output
- Structured output (`Output.object`) enforces the Zod schema at the API level
- The prompt (`RECEIPT_PROMPT`) specifies strict JSON only output with null for unknown fields
- The image is sent as a base64-encoded buffer with its media type

### 4. Extraction Modes

Controlled by `RECEIPT_EXTRACTION_MODE` env var:

| Mode    | Behavior                                       |
| ------- | ---------------------------------------------- |
| `mock`  | Returns synthetic data, no API call            |
| `real`  | Calls OpenRouter, throws on failure            |
| unset   | Treated as `real` (calls OpenRouter)           |

The mode is set in `extractReceipt()`:

```ts
if (process.env.RECEIPT_EXTRACTION_MODE === "mock") {
  return createMockExtraction(file);
}
```

### 5. Extraction Result Metadata

Every successful extraction includes:

```ts
provider: "openrouter",
mode: "real",
outcome: "success_real",
fallbackReason: null,
```

These are persisted in the Convex `receipts` table and displayed in the `ExtractionDiagnostics` UI component.

### 6. Error Handling

The API route (`src/app/api/receipts/extract/route.ts`) classifies errors:

- `NoObjectGeneratedError` from the AI SDK → `failure_parsing` (422)
- "supports image" or "input_invalid" in message → `failure_input_invalid` (400)
- Everything else → `failure_provider` (502)

### 7. OpenRouter-Specific Failure Notes

- If the API key is missing or invalid, the AI SDK will throw with a provider error (classified as `failure_provider`).
- If the model cannot process the image (wrong format, too large), it may throw `NoObjectGeneratedError`.
- The `openrouter/auto` endpoint handles model fallback automatically.

## Environment Variables

| Variable                       | Required | Default                      | Description                        |
| ------------------------------ | -------- | ---------------------------- | ---------------------------------- |
| `OPENROUTER_API_KEY`           | Yes      | —                            | OpenRouter API key                 |
| `RECEIPT_EXTRACTION_MODE`      | No       | `real`                       | `mock` for synthetic, `real` for API |
| `OPENROUTER_RECEIPT_MODEL`     | No       | `google/gemma-4-31b-it:free` | Model identifier override (not wired) |

## Future: OpenAI Fallback

The schema, type system, and env vars (`RECEIPT_EXTRACTION_REAL_PROVIDER`, `OPENAI_RECEIPT_MODEL`) already support OpenAI as an alternative provider. The extraction function currently only wires OpenRouter. To add OpenAI support:

1. Import `createOpenAI` from `ai` SDK
2. Add provider selection logic based on `RECEIPT_EXTRACTION_REAL_PROVIDER`
3. The `ReceiptExtractionProvider` type in `convex/schema.ts` already includes `"openai"`
