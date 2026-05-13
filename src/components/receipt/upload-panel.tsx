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
import type { ExtractedReceipt } from "@/lib/receipts/types";
import { cn } from "@/lib/utils";

const ACCEPTED_CAMERA_TYPES = "image/*";
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
  source: "camera" | "file";
  status: "accepted" | "rejected" | "empty";
  type: string;
  validationReason: string | null;
};

export function UploadPanel() {
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
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
        source,
        status: "empty",
        name: "",
        type: "",
        size: 0,
        validationReason: "No file was returned by the picker.",
      });
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
      return;
    }

    setSelectedReceipt((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return {
        file,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null,
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

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }

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
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          body?.error ?? "Receipt extraction failed. Please try again.",
        );
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
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-primary">Main flow</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Scan or upload a receipt
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Use a paper receipt photo, a screenshot, or a PDF from a digital
          receipt.
        </p>
      </div>

      {selectedReceipt ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-background p-4">
          <SelectedFileCard
            isExtracting={isExtracting}
            onContinue={extractSelectedReceipt}
            receipt={selectedReceipt}
            onClear={clearSelection}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-risk/10 px-3 py-2 text-sm font-medium text-risk">
          {error}
        </p>
      ) : null}

      {selectionState && !selectedReceipt ? (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {selectionState.status === "accepted"
            ? `Selected ${selectionState.name} (${formatFileSize(selectionState.size)}).`
            : `Selected ${selectionState.name || "unknown file"} (${formatFileSize(selectionState.size)} · ${selectionState.type}).`}
        </p>
      ) : null}

      {!selectedReceipt ? (
        <div
          className={cn(
            "mt-6 grid gap-3 rounded-lg border border-dashed border-border bg-background p-4 transition-colors",
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
          <Button asChild className="relative h-14 justify-start overflow-hidden text-base">
            <label>
              <input
                accept={ACCEPTED_CAMERA_TYPES}
                capture="environment"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(event) => {
                  handleFiles(event.currentTarget.files, "camera");
                  event.currentTarget.value = "";
                }}
                onClick={(event) => {
                  event.currentTarget.value = "";
                }}
                ref={cameraInputRef}
                type="file"
              />
              <Camera aria-hidden="true" />
              Take photo
            </label>
          </Button>
          <Button
            asChild
            className="relative h-14 justify-start overflow-hidden text-base"
            variant="outline"
          >
            <label>
              <input
                accept={ACCEPTED_FILE_TYPES}
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(event) => {
                  handleFiles(event.currentTarget.files, "file");
                  event.currentTarget.value = "";
                }}
                onClick={(event) => {
                  event.currentTarget.value = "";
                }}
                ref={fileInputRef}
                type="file"
              />
              <FileUp aria-hidden="true" />
              Use existing image or PDF
            </label>
          </Button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
          <span>Photo, screenshot, or PDF</span>
        </div>
        <div className="flex items-center gap-2">
          <Upload aria-hidden="true" className="size-4 text-primary" />
          <span>Drag and drop also works on laptop</span>
        </div>
      </div>
    </section>
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
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {receipt.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Selected receipt preview"
            className="max-h-72 w-full object-cover"
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
        className="h-12 w-full"
        disabled={isExtracting}
        onClick={onContinue}
        type="button"
      >
        {isExtracting ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <RotateCcw aria-hidden="true" />
        )}
        {isExtracting ? "Extracting receipt..." : "Continue to extraction"}
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

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
