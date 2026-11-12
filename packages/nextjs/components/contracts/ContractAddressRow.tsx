import type { ReactElement } from "react";
import { CopyAddress } from "~~/components/ui/CopyAddress";
import type { PublishedAddress } from "~~/utils/vaultic/contractDirectory";

type ContractAddressRowProps = {
  entry: PublishedAddress;
};

export function ContractAddressRow({ entry }: ContractAddressRowProps): ReactElement {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4 text-left">
      <p className="text-sm font-semibold text-base-content">{entry.label}</p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-base-content/70">{entry.detail}</p>
      {entry.address ? (
        <div className="mt-3">
          <CopyAddress address={entry.address} label={entry.label} full />
          {entry.explorerUrl ? (
            <a
              href={entry.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-primary"
            >
              Stellar Expert
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm font-medium text-base-content/60">Not deployed on this network.</p>
      )}
    </div>
  );
}
