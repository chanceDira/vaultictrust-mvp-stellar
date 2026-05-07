import { useEffect, useState } from "react";
import { getHorizonServer } from "~~/services/stellar/horizonClient";

export type StellarHolding = {
  asset_code: string;
  asset_issuer: string;
  balance: string;
  limit: string;
  buying_liabilities: string;
  selling_liabilities: string;
};

export function useStellarHoldings(publicKey: string | null) {
  const [holdings, setHoldings] = useState<StellarHolding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setHoldings([]);
      return;
    }

    const fetchBalances = async () => {
      setIsLoading(true);
      const server = getHorizonServer();

      try {
        const account = await server.loadAccount(publicKey);
        const vaulticBalances = account.balances
          .filter(b => {
            if (b.asset_type === "native") return false;
            const assetCode = (b as any).asset_code;
            return assetCode && assetCode.startsWith("VT");
          })
          .map(b => ({
            asset_code: (b as any).asset_code,
            asset_issuer: (b as any).asset_issuer,
            balance: b.balance,
            limit: (b as any).limit,
            buying_liabilities: (b as any).buying_liabilities,
            selling_liabilities: (b as any).selling_liabilities,
          }));

        setHoldings(vaulticBalances);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching Stellar holdings:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();

    const interval = setInterval(fetchBalances, 120000);
    return () => clearInterval(interval);
  }, [publicKey]);

  return { holdings, isLoading, error };
}
