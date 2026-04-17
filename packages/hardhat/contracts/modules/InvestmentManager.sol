// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { VaulticAssetRegistry } from "../core/VaultAssetRegistry.sol";
import { VaulticFractionalOwnershipToken } from "./FractionalOwnershipToken.sol";

/**
 * @title VaulticInvestmentManager
 * @author @0xJonaseb11
 * @notice Orchestrates fractional asset tokenization, purchases, proceeds, and full-owner relisting. Holds TOKENIZER_ROLE on the registry.
 * @dev Payments in ERC20 stablecoin. ReentrancyGuard, SafeERC20, pull-over-push withdrawals. UUPS upgradeable, pausable.
 */
contract VaulticInvestmentManager is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    error UnauthorizedCaller(address caller);
    error AssetNotEligibleForTokenization(uint256 assetId);
    error AssetNotOpenForInvestment(uint256 assetId);
    error ZeroPurchaseAmount();
    error InsufficientSharesAvailable(uint256 requested, uint256 available);
    error PaymentMismatch(uint256 expected, uint256 provided);
    error InvalidShareSupply();
    error InvalidPricePerShare();
    error ZeroAddressArgument(string field);
    error InvestorCapExceeded(uint256 assetId, address investor, uint256 cap, uint256 requested);
    error NoProceeds(uint256 assetId);
    error NotAssetOwner(uint256 assetId, address caller);
    error FeeBpsExceedsMaximum(uint256 provided, uint256 maximum);
    error CallerDoesNotHoldFullSupply(uint256 assetId, address caller, uint256 balance, uint256 supply);
    error AssetNotClosedForRelisting(uint256 assetId);
    error AssetNotEligibleForWholePurchase(uint256 assetId);

    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint256 private constant MAX_FEE_BPS = 1_000;

    /// @notice Per-asset investment pool state for the current offering round (reset on relist).
    struct AssetInvestmentPool {
        uint128 totalShares;
        uint128 soldShares;
        uint128 pricePerShare;
        uint128 investorCap;
        address tokenContract;
        bool isFullySubscribed;
        uint256 proceedsCollected;
        uint256 proceedsWithdrawn;
    }

    event AssetTokenized(
        uint256 indexed assetId,
        address indexed tokenContract,
        uint128 totalShares,
        uint128 pricePerShare
    );
    event FractionPurchased(
        uint256 indexed assetId,
        address indexed investor,
        uint256 shareAmount,
        uint256 paymentAmount,
        uint256 feeTaken
    );
    event WholeAssetPurchased(
        uint256 indexed assetId,
        address indexed buyer,
        address indexed seller,
        uint256 paymentAmount,
        uint256 feeTaken
    );
    event WholeAssetRelisted(uint256 indexed assetId, address indexed owner, uint128 newValuation);
    event WholeAssetRelistedAsFractional(uint256 indexed assetId, address indexed owner, uint128 newValuation);
    event OfferingFullySubscribed(uint256 indexed assetId, uint256 totalProceeds);
    event ProceedsWithdrawn(uint256 indexed assetId, address indexed recipient, uint256 amount);
    event AssetRelisted(
        uint256 indexed assetId,
        address indexed newOwner,
        uint128 newTotalShares,
        uint128 newPricePerShare,
        uint32 relistCount
    );
    event FeesSweptToTreasury(address indexed treasury, uint256 amount);
    event ProtocolFeeUpdated(uint256 previousBps, uint256 newBps);
    event TokenImplementationUpdated(address indexed previous, address indexed updated);

    VaulticAssetRegistry public registry;
    IERC20 public paymentToken;
    address public tokenImplementation;
    uint256 public protocolFeeBps;
    address public feeTreasury;
    uint256 public accumulatedFees;
    mapping(uint256 => AssetInvestmentPool) private _pools;
    mapping(uint256 => mapping(address => uint256)) public investorHoldings;
    mapping(uint256 => address[]) private _investorList;
    uint256[50] private __gap;

    modifier poolExists(uint256 assetId) {
        if (_pools[assetId].tokenContract == address(0)) revert AssetNotOpenForInvestment(assetId);
        _;
    }

    /**
     * @notice Initializes the upgradeable proxy.
     * @param _registry VaulticAssetRegistry proxy address.
     * @param _paymentToken ERC20 used for investment payments.
     * @param _tokenImplementation VaulticFractionalOwnershipToken implementation address.
     * @param _feeTreasury Treasury address for fee sweeps.
     * @param _protocolFeeBps Protocol fee in basis points (e.g. 50 = 0.5%).
     * @param _owner Protocol owner.
     */
    function initialize(
        address _registry,
        address _paymentToken,
        address _tokenImplementation,
        address _feeTreasury,
        uint256 _protocolFeeBps,
        address _owner
    ) external initializer {
        if (_registry == address(0)) revert ZeroAddressArgument("registry");
        if (_paymentToken == address(0)) revert ZeroAddressArgument("paymentToken");
        if (_tokenImplementation == address(0)) revert ZeroAddressArgument("tokenImplementation");
        if (_feeTreasury == address(0)) revert ZeroAddressArgument("feeTreasury");
        if (_protocolFeeBps > MAX_FEE_BPS) revert FeeBpsExceedsMaximum(_protocolFeeBps, MAX_FEE_BPS);

        __Ownable_init(_owner);
        __Pausable_init();

        registry = VaulticAssetRegistry(_registry);
        paymentToken = IERC20(_paymentToken);
        tokenImplementation = _tokenImplementation;
        feeTreasury = _feeTreasury;
        protocolFeeBps = _protocolFeeBps;
    }

    /**
     * @notice Deploys a fractional ownership token proxy for an ACTIVE FRACTIONAL asset and records it on the registry. Owner-only.
     * @param assetId Registry identifier of the asset to tokenize.
     * @param totalShares Total fractional shares to mint.
     * @param pricePerShare Payment token units per share.
     * @param investorCap Max shares per investor (0 = uncapped).
     * @return tokenProxy Address of the deployed token proxy.
     */
    function tokenizeAsset(
        uint256 assetId,
        uint128 totalShares,
        uint128 pricePerShare,
        uint128 investorCap
    ) external onlyOwner whenNotPaused nonReentrant returns (address tokenProxy) {
        if (totalShares == 0) revert InvalidShareSupply();
        if (pricePerShare == 0) revert InvalidPricePerShare();

        VaulticAssetRegistry.AssetRecord memory rec = registry.getAsset(assetId);

        if (rec.state != VaulticAssetRegistry.AssetState.ACTIVE) revert AssetNotEligibleForTokenization(assetId);

        if (rec.model != VaulticAssetRegistry.OwnershipModel.FRACTIONAL)
            revert AssetNotEligibleForTokenization(assetId);

        tokenProxy = _deployTokenProxy();

        VaulticFractionalOwnershipToken(tokenProxy).initialize(
            assetId,
            rec.assetName,
            totalShares,
            address(this), // initial holder: InvestmentManager holds all shares
            address(this), // authorizedMinter: InvestmentManager dispatches shares
            owner()
        );

        AssetInvestmentPool storage pool = _pools[assetId];
        pool.totalShares = totalShares;
        pool.pricePerShare = pricePerShare;
        pool.investorCap = investorCap;
        pool.tokenContract = tokenProxy;

        registry.recordTokenization(assetId, tokenProxy, totalShares, pricePerShare);

        emit AssetTokenized(assetId, tokenProxy, totalShares, pricePerShare);
    }

    /**
     * @notice Purchases fractional shares of a TOKENIZED asset. paymentAmount must equal shareAmount × pricePerShare.
     * @param assetId Registry identifier of the asset.
     * @param shareAmount Number of shares to purchase.
     * @param paymentAmount Gross payment in payment token units (must equal shareAmount × pricePerShare).
     */
    function purchaseShares(
        uint256 assetId,
        uint256 shareAmount,
        uint256 paymentAmount
    ) external whenNotPaused nonReentrant poolExists(assetId) {
        if (shareAmount == 0) revert ZeroPurchaseAmount();

        AssetInvestmentPool storage pool = _pools[assetId];

        if (pool.isFullySubscribed) revert AssetNotOpenForInvestment(assetId);

        uint256 remaining = pool.totalShares - pool.soldShares;
        if (shareAmount > remaining) revert InsufficientSharesAvailable(shareAmount, remaining);

        if (pool.investorCap != 0) {
            uint256 current = investorHoldings[assetId][msg.sender];
            if (current + shareAmount > pool.investorCap)
                revert InvestorCapExceeded(assetId, msg.sender, pool.investorCap, shareAmount);
        }

        uint256 grossCost = uint256(pool.pricePerShare) * shareAmount;
        if (paymentAmount != grossCost) revert PaymentMismatch(grossCost, paymentAmount);

        // fee = floor(grossCost * protocolFeeBps / 10_000); same units as payment token
        uint256 fee = (grossCost * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 netCost = grossCost - fee;

        pool.soldShares += uint128(shareAmount);
        pool.proceedsCollected += netCost;
        accumulatedFees += fee;

        if (investorHoldings[assetId][msg.sender] == 0) {
            _investorList[assetId].push(msg.sender);
        }
        investorHoldings[assetId][msg.sender] += shareAmount;

        bool fullySub = pool.soldShares == pool.totalShares;
        if (fullySub) pool.isFullySubscribed = true;

        paymentToken.safeTransferFrom(msg.sender, address(this), grossCost);

        VaulticFractionalOwnershipToken(pool.tokenContract).dispatchShares(msg.sender, shareAmount);

        registry.recordSharesSold(assetId, uint128(shareAmount));

        emit FractionPurchased(assetId, msg.sender, shareAmount, grossCost, fee);

        if (fullySub) {
            registry.closeAsset(assetId);
            emit OfferingFullySubscribed(assetId, pool.proceedsCollected);
        }
    }

    /**
     * @notice Purchases a WHOLE_OWNERSHIP asset for its full valuation. Caller pays in payment token; previous owner receives net (minus protocol fee). Asset is closed and ownership transferred to caller.
     * @param assetId Registry identifier of the whole asset (must be ACTIVE and WHOLE_OWNERSHIP).
     */
    function purchaseWholeAsset(uint256 assetId) external whenNotPaused nonReentrant {
        VaulticAssetRegistry.AssetRecord memory rec = registry.getAsset(assetId);
        if (rec.state != VaulticAssetRegistry.AssetState.ACTIVE) revert AssetNotEligibleForWholePurchase(assetId);
        if (rec.model != VaulticAssetRegistry.OwnershipModel.WHOLE_OWNERSHIP)
            revert AssetNotEligibleForWholePurchase(assetId);

        uint256 grossPayment = uint256(rec.valuation);
        if (grossPayment == 0) revert ZeroPurchaseAmount();

        // fee = floor(grossPayment * protocolFeeBps / 10_000); same units as payment token
        uint256 fee = (grossPayment * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 netToSeller = grossPayment - fee;

        accumulatedFees += fee;

        paymentToken.safeTransferFrom(msg.sender, address(this), grossPayment);
        paymentToken.safeTransfer(rec.assetOwner, netToSeller);

        registry.transferAssetOwnership(assetId, msg.sender);
        registry.closeAsset(assetId);

        emit WholeAssetPurchased(assetId, msg.sender, rec.assetOwner, grossPayment, fee);
    }

    /**
     * @notice Lets the owner of a CLOSED WHOLE asset relist it for sale as whole again. Caller must be the registered asset owner.
     * @param assetId Registry identifier of the CLOSED whole asset.
     * @param newValuation USD valuation for the new listing (6 decimals).
     * @param newMetadataURI URI for fresh documentation.
     */
    function relistWholeAsset(
        uint256 assetId,
        uint128 newValuation,
        string calldata newMetadataURI
    ) external whenNotPaused nonReentrant {
        VaulticAssetRegistry.AssetRecord memory rec = registry.getAsset(assetId);
        if (msg.sender != rec.assetOwner) revert NotAssetOwner(assetId, msg.sender);
        if (rec.state != VaulticAssetRegistry.AssetState.CLOSED) revert AssetNotClosedForRelisting(assetId);
        if (rec.model != VaulticAssetRegistry.OwnershipModel.WHOLE_OWNERSHIP)
            revert AssetNotEligibleForWholePurchase(assetId);

        registry.relistWholeAsset(assetId, newValuation, newMetadataURI);
        emit WholeAssetRelisted(assetId, msg.sender, newValuation);
    }

    /**
     * @notice Lets the owner of a CLOSED WHOLE asset relist it as FRACTIONAL so it can be tokenized and sold in shares. Caller must be the registered asset owner. After this, protocol owner must call tokenizeAsset to deploy the token and open the pool.
     * @param assetId Registry identifier of the CLOSED whole asset.
     * @param newValuation USD valuation for the fractional round (6 decimals).
     * @param newMetadataURI URI for fresh legal/valuation docs.
     */
    function relistAssetAsFractional(
        uint256 assetId,
        uint128 newValuation,
        string calldata newMetadataURI
    ) external whenNotPaused nonReentrant {
        VaulticAssetRegistry.AssetRecord memory rec = registry.getAsset(assetId);
        if (msg.sender != rec.assetOwner) revert NotAssetOwner(assetId, msg.sender);
        if (rec.state != VaulticAssetRegistry.AssetState.CLOSED) revert AssetNotClosedForRelisting(assetId);
        if (rec.model != VaulticAssetRegistry.OwnershipModel.WHOLE_OWNERSHIP)
            revert AssetNotEligibleForWholePurchase(assetId);

        registry.relistAssetAsFractional(assetId, newValuation, newMetadataURI);
        emit WholeAssetRelistedAsFractional(assetId, msg.sender, newValuation);
    }

    /**
     * @notice Lets full owner (100% ERC20 supply) relist a CLOSED asset for a new round. Atomic: verify, reclaim, transfer ownership, relist, record tokenization, reset pool.
     * @param assetId Registry identifier of the CLOSED asset.
     * @param newTotalShares Total share supply for the new round.
     * @param newPricePerShare Price per share for the new round.
     * @param newValuation Updated USD valuation for the new round.
     * @param newMetadataURI URI for fresh legal/valuation docs.
     * @param newInvestorCap Per-investor cap for the new round (0 = uncapped).
     */
    function relistAsset(
        uint256 assetId,
        uint128 newTotalShares,
        uint128 newPricePerShare,
        uint128 newValuation,
        string calldata newMetadataURI,
        uint128 newInvestorCap
    ) external whenNotPaused nonReentrant poolExists(assetId) {
        if (newTotalShares == 0) revert InvalidShareSupply();
        if (newPricePerShare == 0) revert InvalidPricePerShare();

        VaulticAssetRegistry.AssetRecord memory rec = registry.getAsset(assetId);
        if (rec.state != VaulticAssetRegistry.AssetState.CLOSED) revert AssetNotClosedForRelisting(assetId);

        VaulticFractionalOwnershipToken token = VaulticFractionalOwnershipToken(_pools[assetId].tokenContract);
        uint256 supply = token.totalSupply();
        uint256 callerBalance = token.balanceOf(msg.sender);

        if (callerBalance != supply) revert CallerDoesNotHoldFullSupply(assetId, msg.sender, callerBalance, supply);

        AssetInvestmentPool storage pool = _pools[assetId];
        pool.totalShares = newTotalShares;
        pool.soldShares = 0;
        pool.pricePerShare = newPricePerShare;
        pool.investorCap = newInvestorCap;
        pool.isFullySubscribed = false;
        pool.proceedsCollected = 0;
        pool.proceedsWithdrawn = 0;

        address[] storage investors = _investorList[assetId];
        uint256 investorCount = investors.length;

        for (uint256 i; i < investorCount; ) {
            investorHoldings[assetId][investors[i]] = 0;
            unchecked {
                ++i;
            }
        }

        delete _investorList[assetId];

        address[] memory reclaimList;
        if (investorCount > 0) {
            reclaimList = new address[](investorCount + 1);
            for (uint256 i; i < investorCount; ) {
                reclaimList[i] = investors[i];
                unchecked {
                    ++i;
                }
            }
            reclaimList[investorCount] = msg.sender;
        } else {
            reclaimList = new address[](1);
            reclaimList[0] = msg.sender;
        }

        token.reclaimAllShares(reclaimList);
        registry.transferAssetOwnership(assetId, msg.sender);
        registry.relistAsset(assetId, newValuation, newMetadataURI);
        registry.recordTokenization(assetId, address(token), newTotalShares, newPricePerShare);

        uint32 relistCount = registry.getRelistCount(assetId);

        emit AssetRelisted(assetId, msg.sender, newTotalShares, newPricePerShare, relistCount);
    }

    /**
     * @notice Withdraws accumulated net proceeds for the registered asset owner. Pull-over-push; current round only.
     * @param assetId Registry identifier of the asset.
     */
    function withdrawProceeds(uint256 assetId) external whenNotPaused nonReentrant poolExists(assetId) {
        VaulticAssetRegistry.AssetRecord memory rec = registry.getAsset(assetId);
        if (msg.sender != rec.assetOwner) revert NotAssetOwner(assetId, msg.sender);

        AssetInvestmentPool storage pool = _pools[assetId];
        uint256 withdrawable = pool.proceedsCollected - pool.proceedsWithdrawn;
        if (withdrawable == 0) revert NoProceeds(assetId);

        pool.proceedsWithdrawn += withdrawable;

        paymentToken.safeTransfer(msg.sender, withdrawable);

        emit ProceedsWithdrawn(assetId, msg.sender, withdrawable);
    }

    /// @notice Sweeps accumulated protocol fees to feeTreasury. Owner-only.
    function sweepProtocolFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        if (amount == 0) revert NoProceeds(0);

        accumulatedFees = 0;
        paymentToken.safeTransfer(feeTreasury, amount);

        emit FeesSweptToTreasury(feeTreasury, amount);
    }

    /**
     * @notice Updates the protocol fee rate. Owner-only; cap MAX_FEE_BPS.
     * @param newFeeBps New fee in basis points.
     */
    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeBpsExceedsMaximum(newFeeBps, MAX_FEE_BPS);
        uint256 prev = protocolFeeBps;
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(prev, newFeeBps);
    }

    /**
     * @notice Updates the fee treasury address. Owner-only.
     * @param newTreasury New treasury address.
     */
    function setFeeTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddressArgument("feeTreasury");
        feeTreasury = newTreasury;
    }

    /**
     * @notice Updates the token implementation for future proxy deploys. Owner-only; does not upgrade existing proxies.
     * @param newImplementation New implementation address.
     */
    function setTokenImplementation(address newImplementation) external onlyOwner {
        if (newImplementation == address(0)) revert ZeroAddressArgument("tokenImplementation");
        address prev = tokenImplementation;
        tokenImplementation = newImplementation;
        emit TokenImplementationUpdated(prev, newImplementation);
    }

    /// @notice Pauses purchases, relists, and withdrawals.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses the contract.
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Returns the investment pool state for the current round.
     * @param assetId Asset to query.
     * @return pool Full AssetInvestmentPool struct.
     */
    function getInvestmentPool(
        uint256 assetId
    ) external view poolExists(assetId) returns (AssetInvestmentPool memory pool) {
        pool = _pools[assetId];
    }

    /**
     * @notice Returns gross, fee, and net for a whole-asset purchase (valuation).
     * @param assetId Asset to price (must be ACTIVE and WHOLE_OWNERSHIP).
     * @return grossPayment Full valuation (payment token units).
     * @return fee Protocol fee component.
     * @return netToSeller Amount to seller (gross − fee).
     */
    function quoteWholePurchase(
        uint256 assetId
    ) external view returns (uint256 grossPayment, uint256 fee, uint256 netToSeller) {
        VaulticAssetRegistry.AssetRecord memory rec = registry.getAsset(assetId);
        if (
            rec.state != VaulticAssetRegistry.AssetState.ACTIVE ||
            rec.model != VaulticAssetRegistry.OwnershipModel.WHOLE_OWNERSHIP
        ) {
            return (0, 0, 0);
        }
        grossPayment = uint256(rec.valuation);
        fee = (grossPayment * protocolFeeBps) / BPS_DENOMINATOR;
        netToSeller = grossPayment - fee;
    }

    /**
     * @notice Returns gross cost, fee, and net cost for a prospective purchase.
     * @param assetId Asset to price.
     * @param shareAmount Number of shares.
     * @return grossCost Gross payment tokens required.
     * @return fee Protocol fee component.
     * @return netCost Net proceeds (grossCost − fee).
     */
    function quotePurchase(
        uint256 assetId,
        uint256 shareAmount
    ) external view poolExists(assetId) returns (uint256 grossCost, uint256 fee, uint256 netCost) {
        AssetInvestmentPool storage pool = _pools[assetId];
        grossCost = uint256(pool.pricePerShare) * shareAmount;
        fee = (grossCost * protocolFeeBps) / BPS_DENOMINATOR;
        netCost = grossCost - fee;
    }

    /**
     * @notice Returns remaining unsold shares for the current round.
     * @param assetId Asset identifier.
     * @return available Remaining shares.
     */
    function availableShares(uint256 assetId) external view poolExists(assetId) returns (uint256 available) {
        AssetInvestmentPool storage pool = _pools[assetId];
        available = pool.totalShares - pool.soldShares;
    }

    /**
     * @notice Returns shares held by an investor for an asset (current round only).
     * @param assetId Asset identifier.
     * @param investor Investor address.
     * @return shares Share count.
     */
    function getInvestorHoldings(uint256 assetId, address investor) external view returns (uint256 shares) {
        shares = investorHoldings[assetId][investor];
    }

    /**
     * @notice Returns withdrawable net proceeds for the asset owner.
     * @param assetId Asset identifier.
     * @return amount Withdrawable payment token units.
     */
    function withdrawableProceeds(uint256 assetId) external view poolExists(assetId) returns (uint256 amount) {
        AssetInvestmentPool storage pool = _pools[assetId];
        amount = pool.proceedsCollected - pool.proceedsWithdrawn;
    }

    /**
     * @notice Returns the list of investor addresses for the current round (used for reclaimAllShares).
     * @param assetId Asset identifier.
     * @return list Array of investor addresses.
     */
    function getInvestorList(uint256 assetId) external view returns (address[] memory list) {
        list = _investorList[assetId];
    }

    /**
     * @dev Deploys an EIP-1167 minimal proxy clone of tokenImplementation.
     * @return proxy Address of the deployed proxy.
     */
    function _deployTokenProxy() internal returns (address proxy) {
        address impl = tokenImplementation;

        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 20), shl(96, impl))
            mstore(add(ptr, 40), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            proxy := create(0, ptr, 55)
        }

        if (proxy == address(0)) revert ZeroAddressArgument("tokenProxy");
    }

    /**
     * @dev UUPS hook; restricts upgrades to owner.
     * @param newImplementation New implementation address.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {} // solhint-disable-line no-empty-blocks
}
