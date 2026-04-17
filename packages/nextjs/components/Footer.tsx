import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useFetchNativeCurrencyPrice } from "@scaffold-ui/hooks";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { CurrencyDollarIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { Faucet } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

export const Footer = () => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const { price: nativeCurrencyPrice } = useFetchNativeCurrencyPrice();
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

  return (
    <footer className="footer footer-center md:footer-horizontal p-6 md:px-8 md:py-5 bg-base-200 text-base-content border-t border-base-300 text-sm">
      <aside className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 md:place-self-start md:justify-self-start">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-base-100 border border-base-300/70 shadow-sm">
            <Image alt="Vaultic Trust" fill src="/logo.png" sizes="36px" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base-content leading-tight">Vaultic Trust</span>
            <span className="text-xs text-base-content/60 leading-tight">Tokenize Africa&apos;s real economy</span>
          </div>
        </Link>
        <p className="text-base-content/70 max-w-[260px] text-center sm:text-left text-xs sm:text-sm">
          Trust, transparency, and traceability. Built on Avalanche.
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
          {(isInvOwner || isRegistryOwner) && (
            <Link href="/control-panel" className="link link-hover">
              Control panel
            </Link>
          )}
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
        {nativeCurrencyPrice > 0 && (
          <div className="btn btn-primary btn-sm font-normal gap-1 cursor-auto min-h-8">
            <CurrencyDollarIcon className="h-3.5 w-3.5" />
            <span>{nativeCurrencyPrice.toFixed(2)}</span>
          </div>
        )}
        {isLocalNetwork && (
          <>
            <Faucet />
            <Link href="/blockexplorer" passHref className="btn btn-primary btn-sm font-normal gap-1 min-h-8">
              <MagnifyingGlassIcon className="h-3.5 w-3.5" />
              <span>Block Explorer</span>
            </Link>
          </>
        )}
        <SwitchTheme className="flex items-center" />
      </div>
    </footer>
  );
};
