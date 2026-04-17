import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys VaulticFractionalOwnershipToken implementation (no proxy).
 * InvestmentManager clones this for each tokenized asset.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployFractionalTokenImpl: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("VaulticFractionalOwnershipToken", {
    from: deployer,
    log: true,
    autoMine: true,
  });
};

export default deployFractionalTokenImpl;
deployFractionalTokenImpl.tags = ["VaulticFractionalOwnershipTokenImpl"];
deployFractionalTokenImpl.dependencies = ["VaulticAssetRegistry"];
