import React from "react";
import Link from "next/link";
import { BrandLogo } from "~~/components/BrandLogo";

const productLinks = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Asset owners", href: "/owner" },
  { label: "Investors", href: "/investor" },
  { label: "Litepaper", href: "/litepaper" },
  { label: "Contracts", href: "/contracts" },
];

const legalLinks = [
  { label: "Fees", href: "/fees" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
];

function FooterLinkGroup({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="text-center lg:text-left">
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
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
        <div className="flex flex-col items-center gap-10 text-center lg:flex-row lg:items-start lg:justify-between lg:text-left">
          <div className="flex max-w-sm flex-col items-center lg:items-start">
            <BrandLogo size="lg" showTagline href="/" />
            <p className="mt-4 text-sm font-medium leading-relaxed text-base-content/70">
              Buy shares in real assets. List one if you own it.
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
            © {new Date().getFullYear()} VTrust Africa ·{" "}
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
