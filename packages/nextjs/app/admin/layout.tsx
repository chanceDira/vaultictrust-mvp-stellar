import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | VTrust Africa",
  description: "VTrust Africa compliance and asset lifecycle management dashboard. Restricted to admin wallets.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
