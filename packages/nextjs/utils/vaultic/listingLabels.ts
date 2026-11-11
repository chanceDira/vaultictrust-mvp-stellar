import type { AssetStateKey, OwnershipModelKey } from "~~/types/stellar";

export function listingStatusLabel(state: AssetStateKey): string {
  if (state === "Tokenized") return "For sale";
  if (state === "Active") return "Approved";
  if (state === "Pending") return "In review";
  if (state === "Closed") return "Closed";
  if (state === "Relisted") return "Relisted";
  if (state === "Archived") return "Archived";
  return "Removed";
}

export function saleTypeLabel(model: OwnershipModelKey): string {
  return model === "Fractional" ? "Shares" : "Whole asset";
}
