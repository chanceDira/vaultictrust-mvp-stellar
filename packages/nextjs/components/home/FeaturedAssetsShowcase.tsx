"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, BuildingOffice2Icon, CubeIcon } from "@heroicons/react/24/outline";
import { VaulticLoader } from "~~/components/VaulticLoader";
import { fetchAsset, fetchTotalAssets, getContractIds } from "~~/services/stellar/sorobanService";
import { OnChainAsset } from "~~/types/stellar";

const ROTATE_MS = 6000;

async function loadMarketplaceAssets(): Promise<OnChainAsset[]> {
  const contracts = getContractIds();
  if (!contracts.registry) return [];

  const total = await fetchTotalAssets();
  const indices = Array.from({ length: total }, (_, i) => i + 1);
  const results = await Promise.all(indices.map(i => fetchAsset(i)));

  return results
    .filter(
      (asset): asset is OnChainAsset =>
        asset !== null && (asset.state.tag === "Active" || asset.state.tag === "Tokenized"),
    )
    .reverse();
}

function formatUsd(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function FeaturedAssetsShowcase() {
  const [assets, setAssets] = useState<OnChainAsset[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback(
    (next: number) => {
      if (next === index || assets.length === 0) return;
      setVisible(false);
      window.setTimeout(() => {
        setIndex(next);
        setVisible(true);
      }, 220);
    },
    [index, assets.length],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAssets(await loadMarketplaceAssets());
      setIndex(0);
    } catch (e) {
      console.error("[FeaturedAssets] Load failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (assets.length <= 1) return;

    const timer = setInterval(() => {
      goTo((index + 1) % assets.length);
    }, ROTATE_MS);

    return () => clearInterval(timer);
  }, [assets.length, index, goTo]);

  if (loading) {
    return <VaulticLoader message="Loading listings" className="py-16" />;
  }

  if (assets.length === 0) {
    return (
      <div className="live-showcase p-8 text-center sm:p-12">
        <p className="text-base text-base-content/70">
          Marketplace listings will appear here once assets are approved.
        </p>
        <Link href="/marketplace" className="btn btn-primary btn-sm mt-6 gap-2 rounded-xl px-6 stellar-glow">
          Browse marketplace
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const asset = assets[index];
  const soldPct = asset.total_shares > 0n ? Number((asset.sold_shares * 100n) / asset.total_shares) : 0;
  const valuation = Number(asset.valuation) / 1e7;
  const sharePrice = Number(asset.price_per_share) / 1e7;
  const availableShares = Number(asset.total_shares - asset.sold_shares);
  const CategoryIcon = asset.asset_category.toLowerCase().includes("real") ? BuildingOffice2Icon : CubeIcon;

  return (
    <div className="live-showcase">
      <div key={index} className="live-showcase__timer" aria-hidden />

      <div className="flex flex-col gap-4 border-b border-base-300/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
        <div className="flex items-center gap-3">
          <span className="live-showcase__live-dot" aria-hidden />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Live marketplace</p>
            <p className="mt-0.5 text-sm text-base-content/55">Approved listings from Vaultic Trust</p>
          </div>
        </div>
        <Link
          href="/marketplace"
          className="btn btn-ghost btn-sm gap-1.5 self-start rounded-xl px-3 text-primary hover:bg-primary/10 sm:self-auto"
        >
          All listings
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div
          className={`px-5 py-8 transition-opacity duration-300 ease-out sm:px-8 sm:py-10 lg:py-12 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          aria-live="polite"
        >
          <div className="flex items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center border border-primary/20 bg-primary/10 text-primary sm:flex">
              <CategoryIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-base-300/80 bg-base-200/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/55">
                  {asset.asset_code}
                </span>
                <span className="border border-base-300/80 bg-base-200/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/55">
                  {asset.asset_category}
                </span>
                {assets.length > 1 && (
                  <span className="text-xs tabular-nums text-base-content/40">
                    {index + 1} / {assets.length}
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-base-content sm:text-3xl lg:text-4xl">
                {asset.asset_name}
              </h3>
              <p className="mt-2 text-sm text-base-content/60">
                {asset.model.tag === "Fractional" ? "Fractional shares on Stellar" : "Whole asset on Stellar"}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/45">Share price</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-base-content">${sharePrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/45">Available</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-base-content">
                {availableShares.toLocaleString()}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-base-content/45">Status</p>
              <p className="mt-1 text-lg font-bold capitalize text-primary">{asset.state.tag.toLowerCase()}</p>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-base-content/65">Funding progress</span>
              <span className="text-lg font-bold tabular-nums text-primary">{soldPct}%</span>
            </div>
            <div
              className="h-3 w-full overflow-hidden bg-base-300/70"
              role="progressbar"
              aria-valuenow={soldPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-primary stellar-glow transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(soldPct, soldPct > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>

          {assets.length > 1 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {assets.map((item, i) => (
                <button
                  key={item.asset_id}
                  type="button"
                  aria-label={`Show listing ${i + 1}: ${item.asset_name}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => goTo(i)}
                  className={`live-showcase__dot ${i === index ? "live-showcase__dot--active" : ""}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="live-showcase__valuation flex flex-col justify-between border-t border-base-300/60 lg:border-t-0 lg:border-l">
          <div className="p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/45">Valuation</p>
            <p className="mt-2 text-4xl font-bold leading-none tabular-nums text-base-content sm:text-5xl">
              ${formatUsd(valuation)}
            </p>
            <p className="mt-2 text-sm font-medium text-base-content/50">USDC</p>
          </div>
          <div className="flex flex-col gap-2 border-t border-primary/10 p-5 sm:p-6">
            <Link
              href={`/asset/${asset.asset_id}`}
              className="btn btn-outline btn-sm w-full rounded-xl border-base-content/15"
            >
              View asset
            </Link>
            <Link href="/marketplace" className="btn btn-primary btn-sm w-full gap-2 rounded-xl stellar-glow">
              Invest on marketplace
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
