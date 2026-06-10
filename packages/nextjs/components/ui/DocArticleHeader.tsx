import type { ReactNode } from "react";
import Link from "next/link";

type DocArticleHeaderProps = {
  title: string;
  meta?: string;
};

export function DocArticleHeader({ title, meta }: DocArticleHeaderProps) {
  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-primary">Vaultic Trust</p>
      <h1 className="page-title mt-1">{title}</h1>
      {meta && <p className="mt-1 text-sm text-base-content/50">{meta}</p>}
    </div>
  );
}

export function DocArticleFooter({ children }: { children: ReactNode }) {
  return <div className="mt-12 flex flex-wrap gap-4">{children}</div>;
}

export function DocBackLinks() {
  return (
    <>
      <Link href="/" className="btn btn-primary gap-2 rounded-xl">
        Back to home
      </Link>
      <Link href="/support" className="btn btn-outline rounded-xl border-base-content/20">
        Support
      </Link>
      <Link href="/terms" className="btn btn-ghost rounded-xl">
        Terms of Service
      </Link>
      <Link href="/privacy" className="btn btn-ghost rounded-xl">
        Privacy Policy
      </Link>
    </>
  );
}
