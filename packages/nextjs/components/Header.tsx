"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { useOutsideClick } from "~~/hooks/scaffold-eth/useOutsideClick";
import { ADMIN_ADDRESSES } from "~~/scaffold.config";

type HeaderMenuLink = {
  label: string;
  href: string;
  adminOnly?: boolean;
};

const menuLinks: HeaderMenuLink[] = [
  { label: "Home", href: "/" },
  { label: "My assets", href: "/owner" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "My investments", href: "/investor" },
  { label: "Admin", href: "/admin", adminOnly: true },
  { label: "Litepaper", href: "/litepaper" },
];

const HeaderMenuLinks = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname();
  const { publicKey } = useStellarWallet();
  const isAdmin = publicKey && ADMIN_ADDRESSES.includes(publicKey);

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
              } hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </>
  );
};

export const Header = () => {
  const { isConnected, network } = useStellarWallet();

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => burgerMenuRef?.current?.removeAttribute("open");
  useOutsideClick(burgerMenuRef, closeMenu);

  const networkLabel = network ?? "Stellar Testnet";

  return (
    <header className="sticky top-0 z-20 border-b border-base-300 bg-base-100">
      <div className="navbar min-h-0 shrink-0 justify-between px-4 sm:px-6 lg:px-8">
        <div className="navbar-start w-auto lg:w-1/2">
          <details className="dropdown" ref={burgerMenuRef}>
            <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent" aria-label="Open menu">
              <Bars3Icon className="h-6 w-6" />
            </summary>
            <ul className="menu menu-compact dropdown-content mt-3 p-2 shadow-lg bg-base-100 rounded-box w-52">
              <HeaderMenuLinks onClose={closeMenu} />
            </ul>
          </details>
          <Link href="/" className="hidden lg:flex items-center gap-1 mr-8 shrink-0">
            <div className="flex flex-col">
              <span className="font-black text-xl leading-none text-base-content tracking-tighter uppercase">
                Vaultic<span className="text-primary italic">Trust</span>
              </span>
              <span className="text-[9px] text-base-content/40 uppercase tracking-[0.2em] font-bold">
                Stellar RWA Gateway
              </span>
            </div>
          </Link>
          <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
            <HeaderMenuLinks />
          </ul>
        </div>
        <div className="navbar-end gap-3">
          {isConnected && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-success">
              <span className="inline-block h-2 w-2 rounded-full bg-success shadow-[0_0_6px] shadow-success" />
              {networkLabel}
            </span>
          )}
          <SwitchTheme className="flex items-center" />
          <StellarConnectButton />
        </div>
      </div>
    </header>
  );
};
