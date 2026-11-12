"use client";

import { useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";

const COPIED_RESET_MS = 1600;

type CopyAddressProps = {
  address: string;
  label: string;
  full?: boolean;
};

function copyWithSelection(address: string): boolean {
  const field = document.createElement("textarea");
  field.value = address;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  return copied;
}

async function writeAddress(address: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(address);
    return true;
  } catch {
    return copyWithSelection(address);
  }
}

export function CopyAddress({ address, label, full = false }: CopyAddressProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const rowClass = full
    ? "flex min-w-0 items-start justify-between gap-3"
    : "flex min-w-0 items-center justify-between gap-3";
  const addressClass = full
    ? "break-all font-mono text-xs font-semibold leading-relaxed text-base-content"
    : "truncate font-mono text-xs font-semibold text-base-content";

  const copyAddress = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const wrote = await writeAddress(address);
    if (!wrote) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  return (
    <div className={rowClass}>
      <div className="min-w-0 text-left">
        {full ? null : <p className="text-xs font-medium text-base-content/55">{label}</p>}
        <p className={addressClass} title={address}>
          {full ? address : shortenStellarAddress(address, 6)}
        </p>
      </div>
      <button
        type="button"
        onClick={copyAddress}
        aria-label={copied ? "Copied" : `Copy ${label} address`}
        title={address}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base-content/55 transition-colors hover:bg-base-200 hover:text-base-content"
      >
        {copied ? <CheckIcon className="h-4 w-4 text-success" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
      </button>
    </div>
  );
}
