import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Payment token for Vaultic Trust.
 * - Fuji: not deployed; Investment Manager uses Fuji USDC at 0x5425890298aed601595a70AB815c96711a31Bc65.
 * - Local (Hardhat): deploy a test ERC20 (same interface as USDC, 6 decimals) so the app can run locally.
 * MockERC20 is not used; we deploy it under the name "PaymentToken" for local only.
 */
const deployPaymentToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (hre.network.name === "avalancheFuji") {
    console.log("avalancheFuji: no payment token deploy (using Fuji USDC)");
    return;
  }
  if (process.env.PAYMENT_TOKEN_ADDRESS) {
    console.log("PAYMENT_TOKEN_ADDRESS set; skipping payment token deploy");
    return;
  }
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("PaymentToken", {
    contract: "MockERC20",
    from: deployer,
    args: ["Test USDC", "USDC", 6],
    log: true,
    autoMine: true,
  });
};

export default deployPaymentToken;
deployPaymentToken.tags = ["PaymentToken"];
