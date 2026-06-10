import React from "react";
import Link from "next/link";
import { BrandLogo } from "~~/components/BrandLogo";

const productLinks = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Asset owners", href: "/owner" },
  { label: "Investors", href: "/investor" },
  { label: "Litepaper", href: "/litepaper" },
];

const legalLinks = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
];

function FooterLinkGroup({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="footer-heading">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(({ label, href }) => (
          <li key={href}>
            <Link href={href} className="footer-link">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-base-300 bg-base-200">
      <div className="mx-auto max-w-7xl px-3 py-10 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <BrandLogo size="lg" showTagline href="/" />
            <p className="mt-4 text-sm leading-relaxed text-base-content/60">
              Tokenize and invest in real-world assets on Stellar.
            </p>
          </div>

          <div className="flex gap-12 sm:gap-16">
            <FooterLinkGroup title="Product" links={productLinks} />
            <FooterLinkGroup title="Legal" links={legalLinks} />
          </div>
        </div>
      </div>

      <div className="border-t border-base-300/60 bg-base-100/40">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8 lg:px-12">
          <p className="text-center text-xs text-base-content/45 sm:text-left">
            © {new Date().getFullYear()} Vaultic Trust ·{" "}
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noreferrer"
              className="text-base-content/55 transition-colors hover:text-primary"
            >
              Stellar Network
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
