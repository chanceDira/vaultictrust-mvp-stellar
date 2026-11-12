"use client";

import { useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { ArrowTopRightOnSquareIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { toIpfsCid } from "~~/services/stellar/ipfsService";
import { notification } from "~~/utils/vaultic";
import type { ListingDocument } from "~~/utils/vaultic/listingDocument";
import { sha256Hex } from "~~/utils/vaultic/sha256";

const COPIED_RESET_MS = 1600;
const BLOB_REVOKE_MS = 60_000;

type DocumentRoomProps = {
  documents: ListingDocument[];
  loading: boolean;
  unavailable: boolean;
};

function formatAddedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function shortHash(value: string): string {
  return `${value.slice(0, 8)} ${value.slice(-6)}`;
}

export function DocumentRoom({ documents, loading, unavailable }: DocumentRoomProps): ReactElement {
  const [openingCid, setOpeningCid] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyHash = async (event: MouseEvent<HTMLButtonElement>, hash: string) => {
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      window.setTimeout(() => setCopiedHash(current => (current === hash ? null : current)), COPIED_RESET_MS);
    } catch {
      notification.error("Could not copy the file hash.");
    }
  };

  const openDocument = async (document: ListingDocument) => {
    setOpeningCid(document.cid);
    try {
      const cid = toIpfsCid(document.cid);
      const response = await fetch(`/api/ipfs/file?cid=${encodeURIComponent(cid)}`);
      if (!response.ok) {
        notification.error("This file is unavailable right now.");
        return;
      }
      const bytes = await response.arrayBuffer();
      const hash = await sha256Hex(bytes);
      if (hash !== document.sha256) {
        notification.error("This file does not match its recorded hash.");
        return;
      }
      const type = response.headers.get("content-type") ?? "application/octet-stream";
      const url = URL.createObjectURL(new Blob([bytes], { type }));
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), BLOB_REVOKE_MS);
    } catch {
      notification.error("This file is unavailable right now.");
    } finally {
      setOpeningCid(null);
    }
  };

  let body: ReactElement;
  if (loading) {
    body = <p className="mt-1 text-sm font-medium text-base-content/60">Loading the listing files</p>;
  } else if (unavailable) {
    body = <p className="mt-1 text-sm font-medium text-base-content/60">Listing files are unavailable right now.</p>;
  } else if (documents.length === 0) {
    body = (
      <p className="mt-1 text-sm font-medium text-base-content/60">No public files were attached to this listing.</p>
    );
  } else {
    body = (
      <ul className="mt-3 divide-y divide-base-300/80 rounded-xl border border-base-300">
        {documents.map(document => {
          const added = formatAddedAt(document.addedAt);
          const copied = copiedHash === document.sha256;
          return (
            <li key={document.cid} className="flex items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-base-content">{document.name}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs font-medium text-base-content/55">
                  {added ? <span>{added}</span> : null}
                  <span className="font-mono">{shortHash(document.sha256)}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs h-6 min-h-0 px-1"
                    aria-label="Copy file hash"
                    onClick={event => copyHash(event, document.sha256)}
                  >
                    {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
                  </button>
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm shrink-0 gap-1.5 rounded-xl"
                disabled={openingCid === document.cid}
                onClick={() => openDocument(document)}
              >
                Open
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-base-content">Documents</h2>
      {body}
    </div>
  );
}
