import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Investor",
  description: "View your portfolio and tokenized asset holdings on Vaultic Trust.",
});

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
