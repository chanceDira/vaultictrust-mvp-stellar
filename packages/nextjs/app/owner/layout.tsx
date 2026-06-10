import { getMetadata } from "~~/utils/vaultic/getMetadata";

export const metadata = getMetadata({
  title: "Owner",
  description: "Submit and manage your tokenized real-world assets on Vaultic Trust.",
});

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
