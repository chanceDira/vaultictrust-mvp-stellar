import type { NextPage } from "next";
import { ContractDirectory } from "~~/components/contracts/ContractDirectory";
import { DocArticleFooter, DocArticleHeader, DocBackLinks } from "~~/components/ui/DocArticleHeader";
import vaulticConfig from "~~/scaffold.config";
import { publishedAddresses, publishedNetworkName } from "~~/utils/vaultic/contractDirectory";
import { getMetadata } from "~~/utils/vaultic/getMetadata";
import { networkRiskLine } from "~~/utils/vaultic/networkRisk";

const networkId = vaulticConfig.targetNetwork;
const networkName = publishedNetworkName(networkId);
const entries = publishedAddresses(networkId);
const paymentTokenSet = entries.some(entry => entry.id === "usdcIssuer" && entry.address);

export const metadata = getMetadata({
  title: "Risks",
  description: `What can go wrong when you buy through VTrust Africa on ${networkName}, and the contracts this app calls.`,
});

const RisksPage: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-8 text-center sm:px-8 sm:py-10 sm:text-left [&_p]:font-semibold">
        <DocArticleHeader title="Risks" brand={false} meta={networkName} />
        <p className="text-base leading-relaxed text-base-content/85">
          Read this before you buy shares or a whole asset. Share prices can fall, and you can lose money.
        </p>

        <section id="contracts" className="scroll-mt-24">
          <h2 className="mt-8 text-xl font-semibold text-base-content">Contracts</h2>
          <p className="mt-2 text-base leading-relaxed text-base-content/85">
            The contracts can have bugs. They are not audited yet. VTrust Africa reviews a listing before it goes on
            sale. That review is not an audit of the contracts.
          </p>
          <p className="mt-4 text-base leading-relaxed text-base-content/85">
            These are the contracts this app calls on {networkName}. Each listing has its own share issuer. That account
            issued the share asset. It is separate from the contracts below.
          </p>
          {paymentTokenSet ? null : (
            <p className="mt-4 text-base leading-relaxed text-base-content/85">
              The USDC contract for this network is not set.
            </p>
          )}
          <ContractDirectory entries={entries} />
        </section>

        <h2 className="mt-8 text-xl font-semibold text-base-content">Documents and photos</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          The documents and the photo can be wrong. Buying shares, or buying the whole asset, does not by itself
          transfer legal title.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-base-content">Selling again</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          A whole-asset buyer becomes the owner. They can list that asset again as one asset, or split it into shares. A
          share holder can offer those shares to one verified investor. The seller approves that offer, and the buyer
          signs the purchase. It is not an exchange. An offer lasts about 30 days. After that, the holder cancels it and
          can offer the shares again.
        </p>
        <p className="mt-4 text-base leading-relaxed text-base-content/85">
          Shares issued without issuer authorization can still move in a wallet. Yield inside the app will not follow
          that transfer.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-base-content">What this site does not do</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">
          The site does not offer a bank on-ramp, escrow, or custody.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-base-content">Network</h2>
        <p className="mt-2 text-base leading-relaxed text-base-content/85">{networkRiskLine(networkId)}</p>

        <DocArticleFooter>
          <DocBackLinks />
        </DocArticleFooter>
      </article>
    </div>
  );
};

export default RisksPage;
