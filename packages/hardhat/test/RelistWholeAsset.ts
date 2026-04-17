import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";

/**
 * Tests the full relist flow for a CLOSED whole asset: asset states and no unexpected blocks.
 * Flow: register (owner) -> approve -> purchase (buyer becomes owner, asset CLOSED) -> relist (buyer).
 */
describe("Relist whole asset", function () {
  let registry: Contract;
  let investmentManager: Contract;
  let paymentToken: Contract;
  let deployer: string;
  let seller: string;
  let buyer: string;
  const VALUATION = 10n * 10n ** 6n; // 10 USD, 6 decimals
  const METADATA_URI = "https://example.com/metadata";
  const NEW_URI = "https://example.com/metadata-v2";

  before(async function () {
    const signers = await ethers.getSigners();
    deployer = await signers[0].getAddress();
    seller = await signers[1].getAddress();
    buyer = await signers[2].getAddress();

    const hre = await import("hardhat");
    const deployments = (hre as any).deployments;
    if (!deployments?.fixture) {
      this.skip();
      return;
    }
    await deployments.fixture(["PaymentToken", "VaulticInvestmentManager"]);

    const registryDeploy = await (hre as any).deployments.get("VaulticAssetRegistry");
    const imDeploy = await (hre as any).deployments.get("VaulticInvestmentManager");
    const paymentDeploy = await (hre as any).deployments.get("PaymentToken");
    if (!paymentDeploy?.address) {
      this.skip();
      return;
    }

    registry = await ethers.getContractAt("VaulticAssetRegistry", registryDeploy.address);
    investmentManager = await ethers.getContractAt("VaulticInvestmentManager", imDeploy.address);
    paymentToken = await ethers.getContractAt("MockERC20", paymentDeploy.address);

    await paymentToken.mint(buyer, VALUATION * 2n);

    const paused = await registry.paused();
    if (paused) {
      await registry.connect(await ethers.getSigner(deployer)).unpause();
    }
  });

  it("registers, approves, purchases whole, then relists as whole without revert", async function () {
    const registryAsOwner = registry.connect(await ethers.getSigner(deployer));
    const assetId = await registryAsOwner.registerAsset.staticCall(
      seller,
      "house",
      "Real Estate",
      METADATA_URI,
      VALUATION,
      0, // WHOLE_OWNERSHIP
    );
    await registryAsOwner.registerAsset(seller, "house", "Real Estate", METADATA_URI, VALUATION, 0);
    await registryAsOwner.approveAsset(assetId);

    const recAfterApprove = await registry.getAsset(assetId);
    expect(recAfterApprove.state).to.equal(1); // ACTIVE

    await paymentToken.connect(await ethers.getSigner(buyer)).approve(await investmentManager.getAddress(), VALUATION);
    const imAsBuyer = investmentManager.connect(await ethers.getSigner(buyer));
    await imAsBuyer.purchaseWholeAsset(assetId);

    const expectedFee = (VALUATION * 50n) / 10_000n;
    const accumulated = await investmentManager.accumulatedFees();
    expect(accumulated).to.equal(expectedFee);

    const recAfterPurchase = await registry.getAsset(assetId);
    expect(recAfterPurchase.state).to.equal(3); // CLOSED
    expect(recAfterPurchase.assetOwner.toLowerCase()).to.equal(buyer.toLowerCase());

    await imAsBuyer.relistWholeAsset(assetId, VALUATION + 10n * 10n ** 6n, NEW_URI);

    const recAfterRelist = await registry.getAsset(assetId);
    expect(recAfterRelist.state).to.equal(1); // ACTIVE
    expect(recAfterRelist.valuation).to.equal(VALUATION + 10n * 10n ** 6n);
    expect(recAfterRelist.metadataURI).to.equal(NEW_URI);
  });
});
