"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
};

const baseMenuLinks: HeaderMenuLink[] = [
  { label: "Home", href: "/" },
  { label: "Owner", href: "/owner" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Investor", href: "/investor" },
];

const controlPanelLink: HeaderMenuLink = { label: "Control panel", href: "/control-panel" };

export const menuLinks: HeaderMenuLink[] = [...baseMenuLinks];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const { address } = useAccount();
  const { data: invOwner } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "owner",
  });
  const { data: registryOwner } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "owner",
  });
  const isInvOwner = !!address && !!invOwner && address.toLowerCase() === (invOwner as string).toLowerCase();
  const isRegistryOwner =
    !!address && !!registryOwner && address.toLowerCase() === (registryOwner as string).toLowerCase();
  const links = isInvOwner || isRegistryOwner ? [...baseMenuLinks, controlPanelLink] : baseMenuLinks;

  return (
    <>
      {links.map(({ label, href }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
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
 * Site header. Preserves Hardhat/Scaffold-ETH structure: logo, nav links, Connect Wallet, Faucet (local only).
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <header className="sticky top-0 z-20 border-b border-base-300 bg-base-100">
      <div className="navbar min-h-0 shrink-0 justify-between px-4 sm:px-6 lg:px-8">
        <div className="navbar-start w-auto lg:w-1/2">
          <details className="dropdown" ref={burgerMenuRef}>
            <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent" aria-label="Open menu">
              <Bars3Icon className="h-6 w-6" />
            </summary>
            <ul
              className="menu menu-compact dropdown-content mt-3 p-2 shadow-lg bg-base-100 rounded-box w-52"
              onClick={() => burgerMenuRef?.current?.removeAttribute("open")}
            >
              <HeaderMenuLinks />
            </ul>
          </details>
          <Link href="/" className="hidden lg:flex items-center gap-2 mr-8 shrink-0">
            <div className="flex relative w-10 h-10">
              <Image alt="Vaultic Trust" className="cursor-pointer" fill src="/logo.png" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold leading-tight text-base-content">Vaultic Trust</span>
              <span className="text-xs text-base-content/70">Tokenize Africa&apos;s real economy</span>
            </div>
          </Link>
          <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
            <HeaderMenuLinks />
          </ul>
        </div>
        <div className="navbar-end gap-3">
          <SwitchTheme className="flex items-center" />
          <RainbowKitCustomConnectButton />
          {isLocalNetwork && <FaucetButton />}
        </div>
      </div>
    </header>
  );
};
