import type { RecallMatchingResult } from "@/lib/recalls/matching";

export type SavedReceiptCheck = {
  id: string;
  storeName: string | null;
  purchaseDate: string | null;
  createdAt: string;
  result: RecallMatchingResult;
};

const STORAGE_KEY = "recallradar.receiptChecks.v1";

export function saveReceiptCheck(check: SavedReceiptCheck) {
  if (typeof window === "undefined") {
    return;
  }

  const existingChecks = readReceiptChecks();
  const nextChecks = [
    check,
    ...existingChecks.filter((existing) => existing.id !== check.id),
  ].slice(0, 25);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextChecks));
  window.dispatchEvent(new Event("recallradar:receipt-history"));
}

export function readReceiptChecks(): SavedReceiptCheck[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawChecks = window.localStorage.getItem(STORAGE_KEY);

    if (!rawChecks) {
      return [];
    }

    const parsedChecks = JSON.parse(rawChecks);

    return Array.isArray(parsedChecks) ? parsedChecks : [];
  } catch {
    return [];
  }
}

export function subscribeToReceiptHistory(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("recallradar:receipt-history", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("recallradar:receipt-history", onStoreChange);
  };
}

export function getReceiptHistoryServerSnapshot() {
  return [];
}
