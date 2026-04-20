import React from "react";
import Link from "next/link";
import { SwitchTheme } from "~~/components/SwitchTheme";

export const Footer = () => {
  return (
    <footer className="footer footer-center md:footer-horizontal p-6 md:px-8 md:py-5 bg-base-200 text-base-content border-t border-base-300 text-sm">
      <aside className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 md:place-self-start md:justify-self-start">
        <Link href="/" className="flex flex-col gap-0 shrink-0">
          <span className="font-black text-xl leading-none text-base-content tracking-tighter uppercase">
            Vaultic<span className="text-primary italic">Trust</span>
          </span>
          <span className="text-[9px] text-base-content/40 uppercase tracking-[0.2em] font-bold">
            Stellar RWA Gateway
          </span>
        </Link>
        <p className="text-base-content/70 max-w-[280px] text-center sm:text-left text-xs sm:text-sm">
          Trust, transparency, and traceability.{" "}
          <span className="font-semibold text-primary">Built on Stellar Network.</span>
        </p>
      </aside>

      <nav className="flex flex-col sm:flex-row items-center gap-4 md:place-self-center">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-0">
          <Link href="/marketplace" className="link link-hover">
            Marketplace
          </Link>
          <Link href="/owner" className="link link-hover">
            For asset owners
          </Link>
          <Link href="/investor" className="link link-hover">
            For investors
          </Link>
          <Link href="/litepaper" className="link link-hover">
            Litepaper
          </Link>
        </div>
        <span className="hidden sm:inline text-base-content/30">·</span>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-0">
          <Link href="/terms" className="link link-hover">
            Terms of Service
          </Link>
          <Link href="/privacy" className="link link-hover">
            Privacy Policy
          </Link>
          <Link href="/support" className="link link-hover">
            Support
          </Link>
        </div>
      </nav>

      <div className="flex flex-wrap items-center justify-center gap-2 md:place-self-end md:justify-self-end">
        <a
          href="https://stellar.org"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9V8h2v9zm4 0h-2V8h2v9z" />
          </svg>
          Stellar Network
        </a>
        <SwitchTheme className="flex items-center" />
      </div>
    </footer>
  );
};
