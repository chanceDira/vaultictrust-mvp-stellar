"use client";

import { useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";

const COPIED_RESET_MS = 1600;

type CopyAddressProps = {
  address: string;
  label: string;
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

export function CopyAddress({ address, label }: CopyAddressProps): ReactElement {
  const [copied, setCopied] = useState(false);

  const copyAddress = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const wrote = await writeAddress(address);
    if (!wrote) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0 text-left">
        <p className="text-xs font-medium text-base-content/55">{label}</p>
        <p className="truncate font-mono text-xs font-semibold text-base-content" title={address}>
          {shortenStellarAddress(address, 6)}
        </p>
      </div>
      <button type="button" onClick={copyAddress} className="btn btn-ghost btn-xs shrink-0 rounded-lg font-semibold">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
