export type HorizonAssetBalance = {
  asset_type: "credit_alphanum4" | "credit_alphanum12";
  asset_code: string;
  asset_issuer: string;
  balance: string;
  limit: string;
  buying_liabilities: string;
  selling_liabilities: string;
  is_authorized: boolean;
  is_authorized_to_maintain_liabilities: boolean;
  last_modified_ledger?: number;
};

export function isAssetBalance(b: { asset_type: string }): b is HorizonAssetBalance {
  return b.asset_type === "credit_alphanum4" || b.asset_type === "credit_alphanum12";
}
