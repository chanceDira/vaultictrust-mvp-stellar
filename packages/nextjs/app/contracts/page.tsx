import type { NextPage } from "next";
import { ContractDirectory } from "~~/components/contracts/ContractDirectory";
import { DocArticleFooter, DocArticleHeader, DocBackLinks } from "~~/components/ui/DocArticleHeader";
import vaulticConfig from "~~/scaffold.config";
import { publishedAddresses, publishedNetworkName } from "~~/utils/vaultic/contractDirectory";
import { getMetadata } from "~~/utils/vaultic/getMetadata";

const networkId = vaulticConfig.targetNetwork;
const networkName = publishedNetworkName(networkId);
const entries = publishedAddresses(networkId);
const paymentTokenSet = entries.some(entry => entry.id === "usdcIssuer" && entry.address);

export const metadata = getMetadata({
  title: "Contracts",
  description: `The Stellar contracts VTrust Africa calls on ${networkName}.`,
});

const ContractsPage: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
        <DocArticleHeader title="Contracts" brand={false} meta={networkName} />
        <p className="text-base font-semibold leading-relaxed text-base-content/85">
          These are the contracts this app calls on {networkName}. Each listing has its own share issuer. That account
          issued the share asset. It is separate from the contracts below.
        </p>
        {paymentTokenSet ? null : (
          <p className="mt-4 text-base font-semibold leading-relaxed text-base-content/85">
            The USDC contract for this network is not set.
          </p>
        )}
        <ContractDirectory entries={entries} />
        <DocArticleFooter>
          <DocBackLinks />
        </DocArticleFooter>
      </article>
    </div>
  );
};

export default ContractsPage;
