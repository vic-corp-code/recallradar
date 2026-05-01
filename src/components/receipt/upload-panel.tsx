"use client";

import * as React from "react";
import {
  Camera,
  CheckCircle2,
  FileImage,
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

const ACCEPTED_FILE_TYPES = "image/*,.pdf";
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type SelectedReceipt = {
  file: File;
  previewUrl: string | null;
};

export function UploadPanel() {
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedReceipt, setSelectedReceipt] =
    React.useState<SelectedReceipt | null>(null);
  const [isPreparing, setIsPreparing] = React.useState(false);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extraction, setExtraction] = React.useState<ExtractedReceipt | null>(
    null,
  );
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (selectedReceipt?.previewUrl) {
        URL.revokeObjectURL(selectedReceipt.previewUrl);
      }
    };
  }, [selectedReceipt?.previewUrl]);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setExtraction(null);

    if (!isSupportedFile(file)) {
      setError("Use a receipt photo, screenshot, or PDF.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Keep the file under ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setIsPreparing(true);

    window.setTimeout(() => {
      setSelectedReceipt((current) => {
        if (current?.previewUrl) {
          URL.revokeObjectURL(current.previewUrl);
        }

        return {
          file,
          previewUrl: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : null,
        };
      });
      setIsPreparing(false);
    }, 350);
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

      <div
        className={cn(
          "mt-6 rounded-lg border border-dashed border-border bg-background p-4 transition-colors",
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
          handleFiles(event.dataTransfer.files);
        }}
      >
        {selectedReceipt ? (
          <SelectedFileCard
            isExtracting={isExtracting}
            onContinue={extractSelectedReceipt}
            receipt={selectedReceipt}
            onClear={clearSelection}
          />
        ) : (
          <EmptyUploadState isPreparing={isPreparing} />
        )}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-risk/10 px-3 py-2 text-sm font-medium text-risk">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3">
        <input
          accept={ACCEPTED_FILE_TYPES}
          capture="environment"
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
          ref={cameraInputRef}
          type="file"
        />
        <input
          accept={ACCEPTED_FILE_TYPES}
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
          ref={fileInputRef}
          type="file"
        />

        <Button
          className="h-14 justify-start text-base"
          disabled={isPreparing}
          onClick={() => cameraInputRef.current?.click()}
          type="button"
        >
          {isPreparing ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Camera aria-hidden="true" />
          )}
          Take a receipt photo
        </Button>
        <Button
          className="h-14 justify-start text-base"
          disabled={isPreparing}
          onClick={() => fileInputRef.current?.click()}
          type="button"
          variant="outline"
        >
          <FileUp aria-hidden="true" />
          Choose image or PDF
        </Button>
      </div>

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

function EmptyUploadState({ isPreparing }: { isPreparing: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {isPreparing ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <FileImage aria-hidden="true" />
        )}
      </div>
      <h3 className="mt-4 font-semibold">
        {isPreparing ? "Preparing file..." : "Ready for your receipt"}
      </h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
        Camera opens on mobile. File picker accepts images and PDFs.
      </p>
    </div>
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
  return file.type.startsWith("image/") || file.type === "application/pdf";
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
