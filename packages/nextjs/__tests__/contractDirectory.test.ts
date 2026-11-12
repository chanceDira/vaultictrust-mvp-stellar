import { describe, expect, it } from "vitest";
import {
  TESTNET_USDC_ASSET,
  TESTNET_USDC_CONTRACT,
  deployedSorobanContracts,
  getExplorerAssetUrl,
  getExplorerContractUrl,
} from "~~/scaffold.config";
import vaulticConfig from "~~/scaffold.config";
import { getContractIds } from "~~/services/stellar/sorobanRpc";
import { publishedAddresses, publishedNetworkName } from "~~/utils/vaultic/contractDirectory";

describe("publishedAddresses", () => {
  it("matches the contracts the app calls on the active network", () => {
    const ids = getContractIds();
    const byId = Object.fromEntries(publishedAddresses(vaulticConfig.targetNetwork).map(row => [row.id, row.address]));

    expect(byId.registry).toBe(ids.registry);
    expect(byId.userRegistry).toBe(ids.userRegistry);
    expect(byId.investmentManager).toBe(ids.investmentManager);
    expect(byId.dividendManager).toBe(ids.dividendManager);
  });

  it("publishes the testnet payment token and expert links", () => {
    const deployed = deployedSorobanContracts.testnet;
    const byId = Object.fromEntries(publishedAddresses("testnet").map(row => [row.id, row]));

    expect(publishedNetworkName("testnet")).toBe("Stellar Testnet");
    expect(byId.registry?.address).toBe(deployed?.VaulticAssetRegistry);
    expect(byId.usdcContract?.address).toBe(TESTNET_USDC_CONTRACT);
    expect(byId.usdcIssuer?.address).toBe(TESTNET_USDC_ASSET.issuer);
    expect(byId.investmentManager?.explorerUrl).toBe(
      getExplorerContractUrl(deployed?.VaulticInvestmentManager ?? "", "testnet"),
    );
    expect(byId.usdcIssuer?.explorerUrl).toBe(
      getExplorerAssetUrl(TESTNET_USDC_ASSET.code, TESTNET_USDC_ASSET.issuer, "testnet"),
    );
  });

  it("does not publish testnet USDC on mainnet", () => {
    const rows = publishedAddresses("mainnet");

    expect(publishedNetworkName("mainnet")).toBe("Stellar Mainnet");
    expect(rows.every(row => row.address === null)).toBe(true);
    expect(rows.some(row => row.id === "usdcContract" || row.id === "usdcIssuer")).toBe(false);
  });
});
