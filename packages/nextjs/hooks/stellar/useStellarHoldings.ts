import { useEffect, useState } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { getHorizonServer } from "~~/services/stellar/horizonClient";

export type StellarHolding = {
  asset_code: string;
  asset_issuer: string;
  balance: string;
  limit: string;
  buying_liabilities: string;
  selling_liabilities: string;
};

type AssetBalance = Horizon.HorizonApi.BalanceLineAsset;
type AnyBalance = Horizon.HorizonApi.BalanceLine;

function isAssetBalance(b: AnyBalance): b is AssetBalance {
  return b.asset_type === "credit_alphanum4" || b.asset_type === "credit_alphanum12";
}

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
        const vaulticBalances = (account.balances as AnyBalance[])
          .filter((b): b is AssetBalance => isAssetBalance(b) && b.asset_code.startsWith("VT"))
          .map(b => ({
            asset_code: b.asset_code,
            asset_issuer: b.asset_issuer,
            balance: b.balance,
            limit: b.limit,
            buying_liabilities: b.buying_liabilities,
            selling_liabilities: b.selling_liabilities,
          }));
        setHoldings(vaulticBalances);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error("failed to fetch holdings"));
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
