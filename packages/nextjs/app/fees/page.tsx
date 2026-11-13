import type { NextPage } from "next";
import { FeeSchedule } from "~~/components/fees/FeeSchedule";
import { DocArticleFooter, DocArticleHeader, DocBackLinks } from "~~/components/ui/DocArticleHeader";
import { getMetadata } from "~~/utils/vaultic/getMetadata";

export const metadata = getMetadata({
  title: "Fees",
  description: "The VTrust Africa protocol fee on share purchases and whole-asset purchases.",
});

const FeesPage: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-5 py-8 text-center sm:px-8 sm:py-10 sm:text-left [&_p]:font-semibold">
        <DocArticleHeader title="Fees" brand={false} />
        <p className="text-base leading-relaxed text-base-content/85">
          Buying shares, buying a whole asset, or buying shares from another investor pays USDC to the seller. A
          protocol fee is taken from that payment and kept for the treasury. Admins can change the rate. This page does
          not set it.
        </p>
        <FeeSchedule />
        <DocArticleFooter>
          <DocBackLinks />
        </DocArticleFooter>
      </article>
    </div>
  );
};

export default FeesPage;
