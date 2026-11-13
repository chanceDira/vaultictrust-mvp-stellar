"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { useOutsideClick } from "~~/hooks/vaultic/useOutsideClick";
import { adminAddresses } from "~~/utils/vaultic/adminAddresses";

type HeaderMenuLink = {
  label: string;
  href: string;
  adminOnly?: boolean;
};

const menuLinks: HeaderMenuLink[] = [
  { label: "Home", href: "/" },
  { label: "Assets", href: "/owner" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Portfolio", href: "/investor" },
  { label: "Litepaper", href: "/litepaper" },
  { label: "Admin", href: "/admin", adminOnly: true },
];

const HeaderMenuLinks = ({ onClose, compact = false }: { onClose?: () => void; compact?: boolean }) => {
  const pathname = usePathname();
  const { publicKey } = useStellarWallet();
  const isAdmin = publicKey && adminAddresses().includes(publicKey);

  if (compact) {
    return (
      <>
        {menuLinks.map(({ label, href, adminOnly }) => {
          if (adminOnly && !isAdmin) return null;
          const isActive = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onClose}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  isActive ? "bg-base-200 text-base-content" : "text-base-content/70 hover:bg-base-200"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </>
    );
  }

  return (
    <nav className="hidden h-full items-stretch lg:flex">
      {menuLinks.map(({ label, href, adminOnly }) => {
        if (adminOnly && !isAdmin) return null;
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center border-b-2 px-2.5 text-[13px] font-semibold transition-colors xl:px-3 xl:text-sm ${
              isActive
                ? "border-primary text-base-content"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
};

export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => burgerMenuRef?.current?.removeAttribute("open");
  useOutsideClick(burgerMenuRef, closeMenu);

  return (
    <header className="border-b border-base-300/80 bg-base-100/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex h-full min-w-0 flex-1 items-center gap-1 sm:gap-3 lg:gap-8">
          <details className="dropdown shrink-0 lg:hidden" ref={burgerMenuRef}>
            <summary
              className="btn btn-ghost btn-sm btn-square min-h-9 w-9 hover:bg-transparent"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-5 w-5" />
            </summary>
            <ul className="menu menu-compact dropdown-content rounded-box mt-2 w-52 bg-base-100 p-2 shadow-lg">
              <HeaderMenuLinks onClose={closeMenu} compact />
            </ul>
          </details>

          <BrandLogo
            size="md"
            showTagline={false}
            compact
            className="min-w-0 overflow-hidden max-[374px]:shrink-0 max-[374px]:overflow-visible"
          />
          <HeaderMenuLinks />
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <SwitchTheme />
          <StellarConnectButton />
        </div>
      </div>
    </header>
  );
};
