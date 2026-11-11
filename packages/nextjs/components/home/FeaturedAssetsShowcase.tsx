"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { FeaturedListingBody } from "~~/components/home/FeaturedListingBody";
import { VaulticLoader } from "~~/components/VaulticLoader";
import { useAssetMetadata } from "~~/hooks/vaultic/useAssetMetadata";
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

  const current = assets[index];
  const { metadata, isLoading: metadataLoading } = useAssetMetadata(current?.metadata_uri ?? "");

  useEffect(() => {
    if (assets.length <= 1) return;

    const timer = setInterval(() => {
      goTo((index + 1) % assets.length);
    }, ROTATE_MS);

    return () => clearInterval(timer);
  }, [assets.length, index, goTo]);

  if (loading) {
    return <VaulticLoader message="Loading listings" className="py-8" />;
  }

  if (assets.length === 0) {
    return (
      <div className="live-showcase p-6 text-center sm:p-8">
        <p className="text-base text-base-content/70">
          No listings are open right now.
        </p>
        <Link href="/marketplace" className="btn btn-primary btn-sm mt-6 gap-2 rounded-xl px-6 stellar-glow">
          Browse marketplace
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const asset = current;
  if (!asset) return null;
  const valuation = Number(asset.valuation) / 1e7;
  const sharePrice = Number(asset.price_per_share) / 1e7;
  const availableShares = Number(asset.total_shares - asset.sold_shares);

  return (
    <div className="live-showcase">
      <div key={index} className="live-showcase__timer" aria-hidden />

      <div className="flex flex-col gap-4 border-b border-base-300/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
        <div className="flex items-center gap-3">
          <span className="live-showcase__live-dot" aria-hidden />
          <div>
            <p className="text-sm font-bold text-primary">On the marketplace now</p>
            <p className="mt-0.5 text-sm font-medium text-base-content/70">Listings VTrust Africa has reviewed</p>
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

      <FeaturedListingBody
        asset={asset}
        metadata={metadata}
        metadataLoading={metadataLoading}
        visible={visible}
        index={index}
        total={assets.length}
        sharePrice={sharePrice}
        availableShares={availableShares}
        valuationLabel={formatUsd(valuation)}
        onSelect={goTo}
        listings={assets.map(item => ({ id: item.asset_id, name: item.asset_name }))}
      />
    </div>
  );
}
