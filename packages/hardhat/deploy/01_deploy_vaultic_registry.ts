import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys VaulticAssetRegistry (UUPS proxy). Initial tokenizer is deployer;
 * 03_deploy_investment_manager sets the tokenizer to InvestmentManager.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployVaulticRegistry: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("VaulticAssetRegistry", {
    from: deployer,
    proxy: {
      proxyContract: "UUPS",
      execute: {
        init: {
          methodName: "initialize",
          args: [deployer, deployer],
        },
      },
      // OZ v5 UUPS exposes upgradeToAndCall, not upgradeTo; hardhat-deploy may default to upgradeTo on re-runs
      upgradeFunction: {
        methodName: "upgradeToAndCall",
        upgradeArgs: ["{implementation}", "{data}"],
      },
    },
    log: true,
    autoMine: true,
  });
};

export default deployVaulticRegistry;
deployVaulticRegistry.tags = ["VaulticAssetRegistry"];
deployVaulticRegistry.dependencies = [];
