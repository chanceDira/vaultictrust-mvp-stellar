import * as fs from "fs";
import * as path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const PROTOCOL_FEE_BPS = 50; // 0.5%
const FUJI_USDC = "0x5425890298aed601595a70AB815c96711a31Bc65";

/**
 * Deploys VaulticInvestmentManager (UUPS proxy) and sets registry tokenizer to it.
 * Fuji: uses Fuji USDC only; a fresh proxy is deployed so it is initialized with USDC (not any mock).
 * Local: uses PaymentToken (test ERC20 deployed in 00).
 */
const deployInvestmentManager: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const registry = await get("VaulticAssetRegistry");
  const networkName = hre.network.name;

  const paymentTokenAddress =
    process.env.PAYMENT_TOKEN_ADDRESS || (networkName === "avalancheFuji" ? FUJI_USDC : undefined);

  const paymentToken = paymentTokenAddress ? { address: paymentTokenAddress } : await get("PaymentToken");
  const tokenImpl = await get("VaulticFractionalOwnershipToken");

  if (paymentTokenAddress) {
    console.log("Using payment token:", paymentTokenAddress, networkName === "avalancheFuji" ? "(Fuji USDC)" : "");
  }

  if (networkName === "avalancheFuji" && paymentTokenAddress === FUJI_USDC) {
    const deploymentsDir = path.join(hre.config.paths.root, "deployments", "avalancheFuji");
    const toRemove = [
      "VaulticInvestmentManager.json",
      "VaulticInvestmentManager_Proxy.json",
      "VaulticInvestmentManager_Implementation.json",
    ];
    for (const name of toRemove) {
      const filePath = path.join(deploymentsDir, name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("Removed", name, "so a new Investment Manager proxy can be deployed with Fuji USDC.");
      }
    }
  }

  await deploy("VaulticInvestmentManager", {
    from: deployer,
    proxy: {
      proxyContract: "UUPS",
      execute: {
        init: {
          methodName: "initialize",
          args: [
            registry.address,
            paymentToken.address,
            tokenImpl.address,
            deployer, // feeTreasury
            PROTOCOL_FEE_BPS,
            deployer, // owner
          ],
        },
      },
      upgradeFunction: {
        methodName: "upgradeToAndCall",
        upgradeArgs: ["{implementation}", "{data}"],
      },
    },
    log: true,
    autoMine: true,
  });

  const imProxyAddress = (await get("VaulticInvestmentManager")).address;
  const registryContract = await hre.ethers.getContract<Contract>("VaulticAssetRegistry", deployer);
  // Cap gas so local/CI nodes with low block gas limit (e.g. 16_777_216) accept the tx
  const setTokenizerGasLimit = 500_000;
  await registryContract.setTokenizer(imProxyAddress, {
    gasLimit: setTokenizerGasLimit,
  });
  console.log("VaulticAssetRegistry tokenizer set to VaulticInvestmentManager proxy:", imProxyAddress);

  const currentTokenizer = await registryContract.tokenizer();
  if (currentTokenizer.toLowerCase() !== imProxyAddress.toLowerCase()) {
    throw new Error(
      `Deploy verification failed: registry.tokenizer (${currentTokenizer}) != InvestmentManager proxy (${imProxyAddress}). Relist will revert with UnauthorizedCaller.`,
    );
  }
  console.log("Verified: registry.tokenizer equals InvestmentManager proxy.");
};

export default deployInvestmentManager;
deployInvestmentManager.tags = ["VaulticInvestmentManager"];
deployInvestmentManager.dependencies = ["VaulticAssetRegistry", "VaulticFractionalOwnershipTokenImpl"];
