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
import { ADMIN_ADDRESSES } from "~~/scaffold.config";

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
  const isAdmin = publicKey && ADMIN_ADDRESSES.includes(publicKey);

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
                className={`${
                  isActive ? "bg-secondary shadow-md" : ""
                } rounded-full px-3 py-1.5 text-sm hover:bg-secondary hover:shadow-md`}
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
    <nav className="hidden items-center lg:flex">
      {menuLinks.map(({ label, href, adminOnly }) => {
        if (adminOnly && !isAdmin) return null;
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-2.5 py-1 text-[13px] font-medium transition-colors xl:px-3 xl:text-sm ${
              isActive
                ? "bg-secondary text-base-content shadow-sm"
                : "text-base-content/70 hover:bg-base-200/80 hover:text-base-content"
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
    <header className="border-b border-base-300/80 bg-base-100/95">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-[3.75rem] sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3 lg:gap-6">
          <details className="dropdown shrink-0 lg:hidden" ref={burgerMenuRef}>
            <summary
              className="btn btn-ghost btn-sm btn-square min-h-9 w-9 hover:bg-transparent"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-5 w-5" />
            </summary>
            <ul className="menu menu-compact dropdown-content rounded-box mt-2 w-52 bg-base-100 p-2 shadow-lg">
              <HeaderMenuLinks onClose={closeMenu} compact />
              <li className="mt-1 border-t border-base-300 pt-1">
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-sm text-base-content/70">Theme</span>
                  <SwitchTheme />
                </div>
              </li>
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
          <SwitchTheme className="hidden items-center sm:flex sm:scale-100" />
          <StellarConnectButton />
        </div>
      </div>
    </header>
  );
};
