"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { StellarConnectButton } from "~~/components/stellar/StellarConnectButton";
import { useStellarWallet } from "~~/components/stellar/StellarWalletProvider";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { useOutsideClick } from "~~/hooks/scaffold-eth/useOutsideClick";

type HeaderMenuLink = {
  label: string;
  href: string;
};

const menuLinks: HeaderMenuLink[] = [
  { label: "Home", href: "/" },
  { label: "Owner", href: "/owner" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Investor", href: "/investor" },
  { label: "Litepaper", href: "/litepaper" },
];

const HeaderMenuLinks = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href }) => {
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

/**
 * Site header — Stellar / Freighter wallet, Vaultic Trust branding.
 */
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
          <Link href="/" className="hidden lg:flex items-center gap-2 mr-8 shrink-0">
            <div className="flex relative w-10 h-10">
              <Image alt="Vaultic Trust" className="cursor-pointer" fill src="/logo.png" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold leading-tight text-base-content">Vaultic Trust</span>
              <span className="text-xs text-base-content/60">
                Powered by <span className="font-semibold text-primary">Stellar</span>
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
