import { getMetadata } from "~~/utils/vaultic/getMetadata";

export const metadata = getMetadata({
  title: "Investor",
  description: "View your portfolio and tokenized asset holdings on VTrust Africa.",
});

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
