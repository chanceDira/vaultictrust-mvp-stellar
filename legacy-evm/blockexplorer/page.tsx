"use client";

import type { NextPage } from "next";

const BlockExplorerPage: NextPage = () => {
  return (
    <div className="flex flex-col grow items-center justify-center py-16 px-4 text-center">
      <h1 className="text-xl font-bold text-base-content">Stellar Explorer</h1>
      <p className="mt-2 text-sm text-base-content/60 max-w-sm">
        The internal block explorer is being rebuilt for Stellar Network.
        In the meantime, you can use external explorers like StellarExpert or Lumenscan.
      </p>
      <div className="mt-6 flex gap-4">
        <a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">StellarExpert</a>
        <a href="https://testnet.lumenscan.io/" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">Lumenscan</a>
      </div>
    </div>
  );
};

export default BlockExplorerPage;
