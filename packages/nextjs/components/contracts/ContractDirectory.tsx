import type { ReactElement } from "react";
import { ContractAddressRow } from "~~/components/contracts/ContractAddressRow";
import type { PublishedAddress } from "~~/utils/vaultic/contractDirectory";

type ContractDirectoryProps = {
  entries: PublishedAddress[];
};

export function ContractDirectory({ entries }: ContractDirectoryProps): ReactElement {
  return (
    <div className="mt-8 space-y-3">
      {entries.map(entry => (
        <ContractAddressRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
