"use client";

import { useState } from "react";
import Link from "next/link";
import { AddressInput } from "@scaffold-ui/components";
import { useAccount } from "wagmi";
import {
  BanknotesIcon,
  Cog6ToothIcon,
  KeyIcon,
  LockClosedIcon,
  LockOpenIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const PAYMENT_TOKEN_DECIMALS = 6;
const MAX_FEE_BPS = 1000;

export default function ControlPanelPage() {
  const { address, isConnected } = useAccount();
  const [feeBps, setFeeBps] = useState("");
  const [newTreasury, setNewTreasury] = useState("");
  const [newImplementation, setNewImplementation] = useState("");

  const { data: invOwner } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "owner",
  });
  const { data: protocolFeeBps } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "protocolFeeBps",
  });
  const { data: feeTreasury } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "feeTreasury",
  });
  const { data: tokenImplementation } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "tokenImplementation",
  });
  const { data: paused } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "paused",
  });
  const { data: accumulatedFees } = useScaffoldReadContract({
    contractName: "VaulticInvestmentManager",
    functionName: "accumulatedFees",
  });

  const { data: registryOwner } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "owner",
  });
  const { data: registryTokenizer } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "tokenizer",
  });
  const { data: registryPaused } = useScaffoldReadContract({
    contractName: "VaulticAssetRegistry",
    functionName: "paused",
  });
  const { data: imContractInfo } = useDeployedContractInfo({ contractName: "VaulticInvestmentManager" });
  const imProxyAddress = imContractInfo?.address;

  const { writeContractAsync, isMining } = useScaffoldWriteContract({
    contractName: "VaulticInvestmentManager",
  });
  const { writeContractAsync: writeRegistry, isMining: registryMining } = useScaffoldWriteContract({
    contractName: "VaulticAssetRegistry",
  });

  const isOwner = !!address && !!invOwner && address.toLowerCase() === (invOwner as string).toLowerCase();
  const isRegistryOwner =
    !!address && !!registryOwner && address.toLowerCase() === (registryOwner as string).toLowerCase();
  const tokenizerMismatch =
    !!imProxyAddress &&
    !!registryTokenizer &&
    (registryTokenizer as string).toLowerCase() !== imProxyAddress.toLowerCase();

  const accumulatedFormatted =
    accumulatedFees !== undefined ? (Number(accumulatedFees) / 10 ** PAYMENT_TOKEN_DECIMALS).toFixed(2) : "—";
  const canSweep = isOwner && accumulatedFees !== undefined && accumulatedFees > 0n;

  const handleSweep = async () => {
    if (!canSweep) return;
    try {
      await writeContractAsync({ functionName: "sweepProtocolFees" });
      notification.success("Fees swept to treasury");
    } catch (e: unknown) {
      console.error(e);
      notification.error("Sweep failed");
    }
  };

  const handleSetFee = async () => {
    if (!isOwner) return;
    const bps = feeBps.trim() === "" ? null : parseInt(feeBps, 10);
    if (bps === null || isNaN(bps) || bps < 0 || bps > MAX_FEE_BPS) {
      notification.error(`Enter fee 0–${MAX_FEE_BPS} basis points`);
      return;
    }
    try {
      await writeContractAsync({
        functionName: "setProtocolFee",
        args: [BigInt(bps)],
      });
      notification.success("Protocol fee updated");
      setFeeBps("");
    } catch (e: unknown) {
      console.error(e);
      notification.error("Set protocol fee failed");
    }
  };

  const handleSetTreasury = async () => {
    if (!isOwner || !newTreasury || !/^0x[a-fA-F0-9]{40}$/.test(newTreasury)) {
      notification.error("Enter a valid treasury address");
      return;
    }
    try {
      await writeContractAsync({
        functionName: "setFeeTreasury",
        args: [newTreasury as `0x${string}`],
      });
      notification.success("Fee treasury updated");
      setNewTreasury("");
    } catch (e: unknown) {
      console.error(e);
      notification.error("Set fee treasury failed");
    }
  };

  const handleSetImplementation = async () => {
    if (!isOwner || !newImplementation || !/^0x[a-fA-F0-9]{40}$/.test(newImplementation)) {
      notification.error("Enter a valid implementation address");
      return;
    }
    try {
      await writeContractAsync({
        functionName: "setTokenImplementation",
        args: [newImplementation as `0x${string}`],
      });
      notification.success("Token implementation updated");
      setNewImplementation("");
    } catch (e: unknown) {
      console.error(e);
      notification.error("Set token implementation failed");
    }
  };

  const handlePause = async () => {
    if (!isOwner) return;
    try {
      await writeContractAsync({ functionName: "pause" });
      notification.success("Contract paused");
    } catch (e: unknown) {
      console.error(e);
      notification.error("Pause failed");
    }
  };

  const handleUnpause = async () => {
    if (!isOwner) return;
    try {
      await writeContractAsync({ functionName: "unpause" });
      notification.success("Contract unpaused");
    } catch (e: unknown) {
      console.error(e);
      notification.error("Unpause failed");
    }
  };

  const handleSetTokenizer = async () => {
    if (!isRegistryOwner || !imProxyAddress) return;
    try {
      await writeRegistry({
        functionName: "setTokenizer",
        args: [imProxyAddress as `0x${string}`],
      });
      notification.success("Registry tokenizer set to Investment Manager. Relist will work now.");
    } catch (e: unknown) {
      console.error(e);
      notification.error("Set tokenizer failed");
    }
  };

  const handleRegistryUnpause = async () => {
    if (!isRegistryOwner) return;
    try {
      await writeRegistry({ functionName: "unpause" });
      notification.success("Registry unpaused. Relist and other registry operations can proceed.");
    } catch (e: unknown) {
      console.error(e);
      notification.error("Unpause registry failed");
    }
  };

  const handleRegistryPause = async () => {
    if (!isRegistryOwner) return;
    try {
      await writeRegistry({ functionName: "pause" });
      notification.success("Registry paused.");
    } catch (e: unknown) {
      console.error(e);
      notification.error("Pause registry failed");
    }
  };

  return (
    <div className="flex flex-col grow">
      <section className="px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cog6ToothIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-base-content">Control panel</h1>
          </div>
          <p className="text-base-content/80 mb-8">
            Protocol admin for the Investment Manager. Only the contract owner can change settings or sweep fees.
          </p>

          {!isConnected ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-8 sm:p-10 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                <WalletIcon className="h-7 w-7 text-base-content/60" />
              </div>
              <h2 className="text-xl font-bold text-base-content">Connect your wallet</h2>
              <p className="mt-2 text-base-content/70 max-w-md mx-auto">
                Connect the wallet that owns the Investment Manager to access the control panel.
              </p>
              <div className="mt-6">
                <RainbowKitCustomConnectButton />
              </div>
              <p className="mt-6 text-sm text-base-content/60">
                <Link href="/owner" className="link link-primary">
                  Owner dashboard
                </Link>
                {" · "}
                <Link href="/marketplace" className="link link-primary">
                  Marketplace
                </Link>
              </p>
            </div>
          ) : !isOwner && !isRegistryOwner ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-8 sm:p-10 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
                <LockClosedIcon className="h-7 w-7 text-warning" />
              </div>
              <h2 className="text-xl font-bold text-base-content">Access restricted</h2>
              <p className="mt-2 text-base-content/70 max-w-md mx-auto">
                Only the Investment Manager or Registry owner can use this panel. Connect with an owner wallet.
              </p>
              <p className="mt-6 text-sm text-base-content/60">
                <Link href="/owner" className="link link-primary">
                  Owner dashboard
                </Link>
                {" · "}
                <Link href="/marketplace" className="link link-primary">
                  Marketplace
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {isRegistryOwner && (
                <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
                  <h3 className="font-bold text-base-content flex items-center gap-2">
                    <KeyIcon className="h-5 w-5 text-primary" />
                    Registry admin
                  </h3>
                  <p className="mt-1 text-sm text-base-content/70">
                    The registry allows relisting (whole or fractional) only for the address set as tokenizer. Set it to
                    the Investment Manager proxy so owner relists work.
                  </p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4 items-center">
                      <dt className="text-base-content/70">Registry paused</dt>
                      <dd className="font-mono">
                        {registryPaused === true ? (
                          <span className="text-warning font-semibold">Yes — relist will revert until unpaused</span>
                        ) : registryPaused === false ? (
                          "No"
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 items-center">
                      <dt className="text-base-content/70">Current tokenizer</dt>
                      <dd className="font-mono truncate max-w-[14rem]" title={registryTokenizer as string}>
                        {registryTokenizer
                          ? `${(registryTokenizer as string).slice(0, 6)}…${(registryTokenizer as string).slice(-4)}`
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 items-center">
                      <dt className="text-base-content/70">Investment Manager (proxy)</dt>
                      <dd className="font-mono truncate max-w-[14rem]" title={imProxyAddress ?? ""}>
                        {imProxyAddress ? `${imProxyAddress.slice(0, 6)}…${imProxyAddress.slice(-4)}` : "—"}
                      </dd>
                    </div>
                  </dl>
                  {isRegistryOwner && registryPaused === true && (
                    <button
                      type="button"
                      className="btn btn-warning btn-sm mt-2"
                      disabled={registryMining}
                      onClick={handleRegistryUnpause}
                    >
                      {registryMining ? <span className="loading loading-spinner loading-sm" /> : "Unpause registry"}
                    </button>
                  )}
                  {isRegistryOwner && registryPaused === false && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm mt-2 text-base-content/70"
                      disabled={registryMining}
                      onClick={handleRegistryPause}
                    >
                      Pause registry
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm mt-3"
                    disabled={!tokenizerMismatch || registryMining}
                    onClick={handleSetTokenizer}
                  >
                    {registryMining ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      "Set tokenizer to Investment Manager"
                    )}
                  </button>
                  {!tokenizerMismatch && registryTokenizer && imProxyAddress && (
                    <p className="mt-2 text-xs text-success">Tokenizer is already set correctly. Relist should work.</p>
                  )}
                </div>
              )}

              {isOwner && (
                <>
                  <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
                    <h3 className="font-bold text-base-content">Current state</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-base-content/70">Paused</dt>
                        <dd className="font-mono">{paused === true ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-base-content/70">Protocol fee</dt>
                        <dd className="font-mono">
                          {protocolFeeBps !== undefined
                            ? `${Number(protocolFeeBps)} bps (${((Number(protocolFeeBps) / 10000) * 100).toFixed(2)}%)`
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-base-content/70">Fee treasury</dt>
                        <dd className="font-mono truncate max-w-[12rem]" title={feeTreasury as string}>
                          {feeTreasury
                            ? `${(feeTreasury as string).slice(0, 6)}…${(feeTreasury as string).slice(-4)}`
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-base-content/70">Token implementation</dt>
                        <dd className="font-mono truncate max-w-[12rem]" title={tokenImplementation as string}>
                          {tokenImplementation
                            ? `${(tokenImplementation as string).slice(0, 6)}…${(tokenImplementation as string).slice(-4)}`
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-base-content/70">Accumulated fees</dt>
                        <dd className="font-mono">${accumulatedFormatted} (payment token)</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
                    <h3 className="font-bold text-base-content flex items-center gap-2">
                      <BanknotesIcon className="h-5 w-5 text-primary" />
                      Sweep protocol fees
                    </h3>
                    <p className="mt-1 text-sm text-base-content/70">
                      Send accumulated fees to the fee treasury. Balance: ${accumulatedFormatted}
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm mt-3"
                      disabled={!canSweep || isMining}
                      onClick={handleSweep}
                    >
                      {isMining ? <span className="loading loading-spinner loading-sm" /> : "Sweep to treasury"}
                    </button>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
                    <h3 className="font-bold text-base-content">Set protocol fee</h3>
                    <p className="mt-1 text-sm text-base-content/70">
                      Fee in basis points (0–{MAX_FEE_BPS}; 100 = 1%).
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={MAX_FEE_BPS}
                        value={feeBps}
                        onChange={e => setFeeBps(e.target.value)}
                        className="input input-bordered input-sm w-28"
                        placeholder="e.g. 50"
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={isMining}
                        onClick={handleSetFee}
                      >
                        Update fee
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
                    <h3 className="font-bold text-base-content">Set fee treasury</h3>
                    <p className="mt-1 text-sm text-base-content/70">Address that receives swept fees.</p>
                    <div className="mt-3 space-y-2">
                      <AddressInput
                        placeholder="New treasury address"
                        value={newTreasury}
                        onChange={val => setNewTreasury(val ?? "")}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!newTreasury || isMining}
                        onClick={handleSetTreasury}
                      >
                        Update treasury
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
                    <h3 className="font-bold text-base-content">Set token implementation</h3>
                    <p className="mt-1 text-sm text-base-content/70">
                      Implementation used for new fractional token clones. Does not upgrade existing proxies.
                    </p>
                    <div className="mt-3 space-y-2">
                      <AddressInput
                        placeholder="New implementation address"
                        value={newImplementation}
                        onChange={val => setNewImplementation(val ?? "")}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!newImplementation || isMining}
                        onClick={handleSetImplementation}
                      >
                        Update implementation
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
                    <h3 className="font-bold text-base-content">Pause / unpause</h3>
                    <p className="mt-1 text-sm text-base-content/70">
                      When paused, purchases, relists, and withdrawals are disabled.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="btn btn-warning btn-sm gap-1"
                        disabled={paused === true || isMining}
                        onClick={handlePause}
                      >
                        <LockClosedIcon className="h-4 w-4" />
                        Pause
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm gap-1"
                        disabled={paused === false || isMining}
                        onClick={handleUnpause}
                      >
                        <LockOpenIcon className="h-4 w-4" />
                        Unpause
                      </button>
                    </div>
                  </div>
                </>
              )}

              <p className="text-sm text-base-content/60">
                <Link href="/owner" className="link link-primary">
                  Back to Owner dashboard
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
