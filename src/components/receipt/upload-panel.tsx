"use client";

import * as React from "react";
import {
  Camera,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExtractionReview } from "@/components/receipt/extraction-review";
import type {
  ExtractedReceipt,
  ReceiptExtractionError,
} from "@/lib/receipts/types";
import { cn } from "@/lib/utils";

const ACCEPTED_FILE_TYPES = "image/*,.pdf";
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type SelectedReceipt = {
  file: File;
  previewUrl: string | null;
};

type FileSelectionState = {
  name: string;
  size: number;
  source: "file";
  status: "accepted" | "rejected" | "empty";
  type: string;
  validationReason: string | null;
};

export function UploadPanel() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedReceipt, setSelectedReceipt] =
    React.useState<SelectedReceipt | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extraction, setExtraction] = React.useState<ExtractedReceipt | null>(
    null,
  );
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectionState, setSelectionState] =
    React.useState<FileSelectionState | null>(null);

  function openFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  React.useEffect(() => {
    return () => {
      if (selectedReceipt?.previewUrl) {
        URL.revokeObjectURL(selectedReceipt.previewUrl);
      }
    };
  }, [selectedReceipt?.previewUrl]);

  function handleFiles(
    files: FileList | null,
    source: FileSelectionState["source"],
  ) {
    const file = files?.[0];

    if (!file) {
      setSelectionState({
        source: "file",
        status: "empty",
        name: "",
        type: "",
        size: 0,
        validationReason: "No file was returned by the picker.",
      });
      setError(
        "No photo was returned by the camera picker. Please retry or use existing image.",
      );
      return;
    }

    const validationReason = getValidationReason(file);

    setSelectionState({
      source,
      status: validationReason ? "rejected" : "accepted",
      name: file.name || "camera-photo",
      type: file.type || "unknown",
      size: file.size,
      validationReason,
    });

    setError(null);
    setExtraction(null);
    if (validationReason) {
      setError(validationReason);
      setSelectedReceipt((current) => {
        if (current?.previewUrl) {
          URL.revokeObjectURL(current.previewUrl);
        }

        return null;
      });
      return;
    }

    setSelectedReceipt((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return {
        file,
        previewUrl: createPreviewUrl(file),
      };
    });
  }

  function clearSelection() {
    setSelectedReceipt((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });
    setError(null);
    setExtraction(null);
    setSelectionState(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function extractSelectedReceipt() {
    if (!selectedReceipt) {
      return;
    }

    setError(null);
    setIsExtracting(true);

    const formData = new FormData();
    formData.set("file", selectedReceipt.file);

    try {
      const response = await fetch("/api/receipts/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | ReceiptExtractionError
          | null;

        throw new Error(userFacingExtractionError(body));
      }

      const nextExtraction = (await response.json()) as ExtractedReceipt;
      setExtraction(nextExtraction);
    } catch (extractError) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : "Receipt extraction failed. Please try again.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  if (extraction) {
    return (
      <ExtractionReview
        extraction={extraction}
        onBack={() => setExtraction(null)}
      />
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-semibold text-primary">Step 1 of 3</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Scan or upload a receipt
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Use a paper receipt photo or screenshot for best results. PDFs can be
          selected, but image receipts are more reliable in the current MVP.
        </p>
      </div>

      {selectedReceipt ? (
        <div className="mt-6 rounded-[1.25rem] border border-dashed border-border bg-background p-4">
          <SelectedFileCard
            isExtracting={isExtracting}
            onContinue={extractSelectedReceipt}
            receipt={selectedReceipt}
            onClear={clearSelection}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-2xl bg-risk/10 px-3 py-2 text-sm font-medium text-risk" role="alert">
          {error}
        </p>
      ) : null}

      {selectionState && !selectedReceipt ? (
        <p className="mt-3 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
          {selectionState.status === "accepted"
            ? `Selected ${selectionState.name} (${formatFileSize(selectionState.size)}).`
            : `Selected ${selectionState.name || "unknown file"} (${formatFileSize(selectionState.size)} · ${selectionState.type}).`}
        </p>
      ) : null}

      {!selectedReceipt ? (
        <div
          className={cn(
            "mt-6 grid gap-4 rounded-[1.25rem] border border-dashed border-border bg-background p-4 transition-colors duration-200 sm:p-5",
            isDragging && "border-primary bg-accent",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFiles(event.dataTransfer.files, "file");
          }}
        >
          <input
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            onChange={(event) => {
              handleFiles(event.currentTarget.files, "file");
            }}
            ref={fileInputRef}
            type="file"
          />
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Camera aria-hidden="true" className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold">Drop a receipt here</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                A clear, flat photo with product names visible gives the best
                matching results.
              </p>
            </div>
          </div>
          <Button
            className="h-14 justify-start rounded-2xl text-base"
            onClick={openFilePicker}
            type="button"
            variant="outline"
          >
            <FileUp aria-hidden="true" />
            Choose receipt image or PDF
          </Button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
          <span>Photo or screenshot recommended</span>
        </div>
        <div className="flex items-center gap-2">
          <Upload aria-hidden="true" className="size-4 text-primary" />
          <span>Drag and drop also works on laptop</span>
        </div>
      </div>
    </section>
  );
}

function userFacingExtractionError(body: ReceiptExtractionError | null) {
  if (!body) {
    return "Receipt extraction failed. Please try again.";
  }

  if (body.outcome === "failure_input_invalid") {
    return body.error;
  }

  if (body.outcome === "failure_parsing") {
    return "The file was uploaded, but receipt fields could not be read. Try a clearer photo or another receipt.";
  }

  if (body.outcome === "failure_provider") {
    if (body.details && isProviderRateLimit(body.details)) {
      return `The extraction provider rate-limited this API key or model. Details: ${body.details}`;
    }

    return [
      "Receipt extraction provider is unavailable right now.",
      body.details ? `Details: ${body.details}` : "Please retry in a moment.",
    ].join(" ");
  }

  return body.error;
}

function isProviderRateLimit(details: string) {
  const normalizedDetails = details.toLowerCase();

  return (
    normalizedDetails.includes("429") ||
    normalizedDetails.includes("too many requests") ||
    normalizedDetails.includes("rate limit")
  );
}

function SelectedFileCard({
  isExtracting,
  onContinue,
  receipt,
  onClear,
}: {
  isExtracting: boolean;
  onContinue: () => void;
  receipt: SelectedReceipt;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.25rem] border border-border bg-card">
        {receipt.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Selected receipt preview"
            className="max-h-80 w-full object-cover"
            src={receipt.previewUrl}
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-muted text-muted-foreground">
            <FileText aria-hidden="true" className="size-12" />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{receipt.file.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatFileSize(receipt.file.size)}
          </p>
        </div>
        <Button
          aria-label="Remove selected receipt"
          onClick={onClear}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <Button
        className="h-12 w-full rounded-2xl"
        disabled={isExtracting}
        onClick={onContinue}
        type="button"
      >
        {isExtracting ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <RotateCcw aria-hidden="true" />
        )}
        {isExtracting ? "Reading receipt..." : "Review extracted products"}
      </Button>
    </div>
  );
}

function isSupportedFile(file: File) {
  if (isImageFile(file) || file.type === "application/pdf") {
    return true;
  }

  return /\.(heic|heif|jpe?g|pdf|png|webp)$/i.test(file.name);
}

function getValidationReason(file: File) {
  if (!isSupportedFile(file)) {
    return "Use a receipt photo, screenshot, or PDF.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Keep the file under ${MAX_FILE_SIZE_MB} MB.`;
  }

  return null;
}

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)
  );
}

function createPreviewUrl(file: File) {
  if (!isImageFile(file)) {
    return null;
  }

  try {
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
