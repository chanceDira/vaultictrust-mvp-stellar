"use client";

import type { ChangeEvent, ReactElement } from "react";
import { notification } from "~~/utils/vaultic";
import {
  MAX_LISTING_DOCUMENTS,
  MAX_LISTING_DOCUMENT_BYTES,
  isListingDocumentMime,
} from "~~/utils/vaultic/listingDocument";

type ListingDocumentFieldProps = {
  files: File[];
  disabled: boolean;
  onChange: (files: File[]) => void;
};

export function ListingDocumentField({ files, disabled, onChange }: ListingDocumentFieldProps): ReactElement {
  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = [...(event.target.files ?? [])];
    event.target.value = "";
    if (selected.length === 0) return;

    const accepted: File[] = [];
    for (const file of selected) {
      if (!isListingDocumentMime(file.type) || file.size > MAX_LISTING_DOCUMENT_BYTES) {
        notification.error(`${file.name} must be a PDF, JPG, PNG, or WebP under 4 MB.`);
        continue;
      }
      accepted.push(file);
    }

    const next = [...files, ...accepted].slice(0, MAX_LISTING_DOCUMENTS);
    if (files.length + accepted.length > MAX_LISTING_DOCUMENTS) {
      notification.error(`You can attach up to ${MAX_LISTING_DOCUMENTS} public files.`);
    }
    onChange(next);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  return (
    <div className="form-control w-full">
      <label className="label pb-1">
        <span className="label-text font-semibold">Public files</span>
        <span className="label-text-alt text-base-content/40">optional, up to 6</span>
      </label>
      <input
        className="file-input file-input-bordered w-full"
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        multiple
        onChange={addFiles}
        disabled={disabled}
      />
      <p className="mt-2 text-xs font-medium leading-relaxed text-base-content/55">
        Title, valuation, and photos buyers can open. Do not upload identity documents.
      </p>
      {files.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-base-300 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm font-semibold text-base-content">{file.name}</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs rounded-lg"
                onClick={() => removeFile(index)}
                disabled={disabled}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
