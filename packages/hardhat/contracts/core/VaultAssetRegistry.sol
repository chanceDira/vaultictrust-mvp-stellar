// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VaulticAssetRegistry
 * @author @0xJonaseb11
 * @notice On-chain registry for real-world assets tokenized via Vaultic Trust.
 * Lifecycle: PENDING → ACTIVE → TOKENIZED → CLOSED; CLOSED may transition to RELISTED for a new offering round.
 * @dev Registry state only; investment logic and token issuance live in separate contracts. UUPS upgradeable, pausable.
 */
contract VaulticAssetRegistry is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    UUPSUpgradeable
{
    error UnauthorizedCaller(address caller);
    error AssetAlreadyRegistered(uint256 assetId);
    error InvalidStateTransition(uint256 assetId, AssetState current, AssetState requested);
    error EmptyStringField(string fieldName);
    error InvalidValuation(uint256 provided);
    error AssetNotFound(uint256 assetId);
    error AssetNotActiveForTokenization(uint256 assetId, AssetState current);
    error InvalidShareSupply(uint256 provided);
    error InvalidTokenPrice(uint256 provided);
    error InvalidTokenContractAddress();
    error OwnershipModelMismatch(uint256 assetId, OwnershipModel model);
    error AssetNotClosedForRelisting(uint256 assetId, AssetState current);
    error InvalidNewOwnerAddress();

    /// @notice Lifecycle states; transitions enforced in _requireTransition.
    enum AssetState {
        PENDING,
        ACTIVE,
        TOKENIZED,
        CLOSED,
        RELISTED
    }

    enum OwnershipModel {
        WHOLE_OWNERSHIP,
        FRACTIONAL
    }

    /// @notice Canonical on-chain record for a registered asset.
    struct AssetRecord {
        uint256 assetId;
        address assetOwner;
        AssetState state;
        OwnershipModel model;
        uint48 registeredAt;
        uint128 valuation;
        uint128 totalShares;
        uint128 pricePerShare;
        uint128 soldShares;
        address tokenContract;
        uint48 tokenizedAt;
        uint32 relistCount;
        uint48 relistedAt;
        string assetName;
        string assetCategory;
        string metadataURI;
    }

    event AssetRegistered(
        uint256 indexed assetId,
        address indexed assetOwner,
        string assetName,
        string assetCategory,
        uint128 valuation,
        OwnershipModel model
    );

    event AssetApproved(uint256 indexed assetId, address indexed approvedBy);
    event AssetTokenized(
        uint256 indexed assetId,
        address indexed tokenContract,
        uint128 totalShares,
        uint128 pricePerShare
    );
    event AssetClosed(uint256 indexed assetId, address indexed closedBy);
    event SoldSharesUpdated(uint256 indexed assetId, uint128 soldShares);
    event TokenizerUpdated(address indexed previous, address indexed updated);
    event AssetOwnershipTransferred(uint256 indexed assetId, address indexed previousOwner, address indexed newOwner);
    event AssetRelisted(uint256 indexed assetId, address indexed newOwner, uint128 newValuation, uint32 relistCount);
    event AssetRelistedAsWhole(uint256 indexed assetId, address indexed assetOwner, uint128 newValuation);

    address public tokenizer;
    uint96 private _assetCounter;
    mapping(uint256 => AssetRecord) private _assets;
    mapping(address => uint256[]) private _ownerAssets;
    mapping(bytes32 => bool) private _registrationGuard;
    uint256[50] private __gap;

    modifier onlyTokenizer() {
        if (msg.sender != tokenizer) revert UnauthorizedCaller(msg.sender);
        _;
    }

    modifier assetExists(uint256 assetId) {
        if (_assets[assetId].assetId == 0) revert AssetNotFound(assetId);
        _;
    }

    /**
     * @notice Initializes the upgradeable proxy.
     * @param initialOwner Address that will own the registry.
     * @param initialTokenizer Address granted TOKENIZER_ROLE (e.g. InvestmentManager).
     */
    function initialize(address initialOwner, address initialTokenizer) external initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();

        if (initialTokenizer == address(0)) revert InvalidTokenContractAddress();

        tokenizer = initialTokenizer;
        _assetCounter = 1;
    }

    /**
     * @notice Grants TOKENIZER_ROLE to a new address.
     * @param newTokenizer Address to assign as tokenizer.
     */
    function setTokenizer(address newTokenizer) external onlyOwner {
        if (newTokenizer == address(0)) revert InvalidTokenContractAddress();
        address prev = tokenizer;
        tokenizer = newTokenizer;
        emit TokenizerUpdated(prev, newTokenizer);
    }

    /**
     * @notice Registers a new real-world asset. Owner-only; deduplicated by content hash.
     * @param assetOwner Address of the asset owner.
     * @param assetName Human-readable name.
     * @param assetCategory Category (e.g. "Real Estate").
     * @param metadataURI URI for off-chain documentation.
     * @param valuation USD valuation (6 decimals).
     * @param model WHOLE_OWNERSHIP or FRACTIONAL.
     * @return assetId Assigned asset identifier.
     */
    function registerAsset(
        address assetOwner,
        string calldata assetName,
        string calldata assetCategory,
        string calldata metadataURI,
        uint128 valuation,
        OwnershipModel model
    ) external onlyOwner whenNotPaused nonReentrant returns (uint256 assetId) {
        if (assetOwner == address(0)) revert UnauthorizedCaller(address(0));
        if (bytes(assetName).length == 0) revert EmptyStringField("assetName");
        if (bytes(assetCategory).length == 0) revert EmptyStringField("assetCategory");
        if (bytes(metadataURI).length == 0) revert EmptyStringField("metadataURI");
        if (valuation == 0) revert InvalidValuation(0);

        bytes32 guard = keccak256(abi.encodePacked(assetName, assetCategory, metadataURI, assetOwner));
        if (_registrationGuard[guard]) revert AssetAlreadyRegistered(0);

        assetId = _assetCounter++;
        _registrationGuard[guard] = true;

        AssetRecord storage rec = _assets[assetId];
        rec.assetId = assetId;
        rec.assetOwner = assetOwner;
        rec.state = AssetState.PENDING;
        rec.model = model;
        rec.registeredAt = uint48(block.timestamp);
        rec.valuation = valuation;
        rec.assetName = assetName;
        rec.assetCategory = assetCategory;
        rec.metadataURI = metadataURI;

        _ownerAssets[assetOwner].push(assetId);
        emit AssetRegistered(assetId, assetOwner, assetName, assetCategory, valuation, model);
    }

    /**
     * @notice Transitions an asset from PENDING → ACTIVE, enabling investment.
     * @param assetId Asset identifier to approve.
     */
    function approveAsset(uint256 assetId) external onlyOwner whenNotPaused assetExists(assetId) {
        AssetRecord storage rec = _assets[assetId];
        _requireTransition(assetId, rec.state, AssetState.ACTIVE);
        rec.state = AssetState.ACTIVE;
        emit AssetApproved(assetId, msg.sender);
    }

    /**
     * @notice Links an ERC20 to a FRACTIONAL asset and marks it TOKENIZED. Tokenizer-only.
     * @param assetId Asset to mark as tokenized.
     * @param tokenContract Deployed fractional ERC20 address.
     * @param totalShares Total ERC20 supply for this round.
     * @param pricePerShare Price per share in payment token units.
     */
    function recordTokenization(
        uint256 assetId,
        address tokenContract,
        uint128 totalShares,
        uint128 pricePerShare
    ) external onlyTokenizer whenNotPaused assetExists(assetId) {
        AssetRecord storage rec = _assets[assetId];

        if (rec.model != OwnershipModel.FRACTIONAL) revert OwnershipModelMismatch(assetId, rec.model);
        if (rec.state != AssetState.ACTIVE && rec.state != AssetState.RELISTED)
            revert AssetNotActiveForTokenization(assetId, rec.state);
        if (tokenContract == address(0)) revert InvalidTokenContractAddress();
        if (totalShares == 0) revert InvalidShareSupply(0);
        if (pricePerShare == 0) revert InvalidTokenPrice(0);

        rec.state = AssetState.TOKENIZED;
        rec.tokenContract = tokenContract;
        rec.totalShares = totalShares;
        rec.pricePerShare = pricePerShare;
        rec.tokenizedAt = uint48(block.timestamp);

        emit AssetTokenized(assetId, tokenContract, totalShares, pricePerShare);
    }

    /**
     * @notice Increments the sold-share counter for a fractional asset. Tokenizer-only.
     * @param assetId Asset receiving the purchase.
     * @param sharesDelta Number of shares just purchased.
     */
    function recordSharesSold(uint256 assetId, uint128 sharesDelta) external onlyTokenizer assetExists(assetId) {
        if (sharesDelta == 0) revert InvalidShareSupply(0);

        AssetRecord storage rec = _assets[assetId];
        uint128 updated = rec.soldShares + sharesDelta;
        rec.soldShares = updated;

        emit SoldSharesUpdated(assetId, updated);
    }

    /**
     * @notice Marks an asset as CLOSED. Callable by owner or tokenizer.
     * @param assetId Asset identifier to close.
     */
    function closeAsset(uint256 assetId) external whenNotPaused assetExists(assetId) {
        if (msg.sender != owner() && msg.sender != tokenizer) revert UnauthorizedCaller(msg.sender);

        AssetRecord storage rec = _assets[assetId];

        if (rec.state == AssetState.PENDING || rec.state == AssetState.CLOSED)
            revert InvalidStateTransition(assetId, rec.state, AssetState.CLOSED);

        rec.state = AssetState.CLOSED;
        emit AssetClosed(assetId, msg.sender);
    }

    /**
     * @notice Updates registered assetOwner when full ownership transfers. Tokenizer-only; call before relistAsset.
     * @param assetId Asset whose ownership is transferring.
     * @param newOwner New full owner address.
     */
    function transferAssetOwnership(
        uint256 assetId,
        address newOwner
    ) external onlyTokenizer whenNotPaused assetExists(assetId) {
        if (newOwner == address(0)) revert InvalidNewOwnerAddress();

        AssetRecord storage rec = _assets[assetId];
        address previousOwner = rec.assetOwner;
        if (previousOwner == newOwner) return;

        _removeFromOwnerAssets(previousOwner, assetId);
        rec.assetOwner = newOwner;
        _ownerAssets[newOwner].push(assetId);
        emit AssetOwnershipTransferred(assetId, previousOwner, newOwner);
    }

    /// @dev Removes one occurrence of assetId from an owner's list (swap-with-last and pop).
    function _removeFromOwnerAssets(address owner, uint256 assetId) private {
        uint256[] storage list = _ownerAssets[owner];
        uint256 n = list.length;
        for (uint256 i; i < n; i++) {
            if (list[i] == assetId) {
                if (i != n - 1) list[i] = list[n - 1];
                list.pop();
                return;
            }
        }
    }

    /**
     * @notice Transitions a CLOSED FRACTIONAL asset to RELISTED for a fresh offering round. Tokenizer-only.
     * @dev Resets soldShares, totalShares, pricePerShare, tokenizedAt; sets valuation and metadataURI. Increments relistCount.
     * @param assetId Asset to relist (must be CLOSED).
     * @param newValuation USD valuation for the new round.
     * @param newMetadataURI URI for fresh legal/valuation docs.
     */
    function relistAsset(
        uint256 assetId,
        uint128 newValuation,
        string calldata newMetadataURI
    ) external onlyTokenizer whenNotPaused assetExists(assetId) {
        if (newValuation == 0) revert InvalidValuation(0);
        if (bytes(newMetadataURI).length == 0) revert EmptyStringField("metadataURI");

        AssetRecord storage rec = _assets[assetId];
        if (rec.state != AssetState.CLOSED) revert AssetNotClosedForRelisting(assetId, rec.state);
        if (rec.model != OwnershipModel.FRACTIONAL) revert OwnershipModelMismatch(assetId, rec.model);

        rec.state = AssetState.RELISTED;
        rec.valuation = newValuation;
        rec.metadataURI = newMetadataURI;
        rec.soldShares = 0;
        rec.totalShares = 0;
        rec.pricePerShare = 0;
        rec.tokenizedAt = 0;
        uint32 newCount = rec.relistCount + 1;
        rec.relistCount = newCount;
        rec.relistedAt = uint48(block.timestamp);

        emit AssetRelisted(assetId, rec.assetOwner, newValuation, newCount);
    }

    /**
     * @notice Reopens a CLOSED WHOLE asset for sale as whole again. Tokenizer-only; caller must be asset owner (enforced by tokenizer).
     * @param assetId Asset to relist (must be CLOSED and WHOLE_OWNERSHIP).
     * @param newValuation USD valuation for the new listing.
     * @param newMetadataURI URI for fresh docs.
     */
    function relistWholeAsset(
        uint256 assetId,
        uint128 newValuation,
        string calldata newMetadataURI
    ) external onlyTokenizer whenNotPaused assetExists(assetId) {
        if (newValuation == 0) revert InvalidValuation(0);
        if (bytes(newMetadataURI).length == 0) revert EmptyStringField("metadataURI");

        AssetRecord storage rec = _assets[assetId];
        if (rec.state != AssetState.CLOSED) revert AssetNotClosedForRelisting(assetId, rec.state);
        if (rec.model != OwnershipModel.WHOLE_OWNERSHIP) revert OwnershipModelMismatch(assetId, rec.model);

        _requireTransition(assetId, rec.state, AssetState.ACTIVE);
        rec.state = AssetState.ACTIVE;
        rec.valuation = newValuation;
        rec.metadataURI = newMetadataURI;

        emit AssetRelistedAsWhole(assetId, rec.assetOwner, newValuation);
    }

    /**
     * @notice Transitions a CLOSED WHOLE asset to RELISTED as FRACTIONAL so it can be tokenized and sold in shares. Tokenizer-only; caller must be asset owner (enforced by tokenizer).
     * @param assetId Asset to relist (must be CLOSED and WHOLE_OWNERSHIP).
     * @param newValuation USD valuation for the fractional round.
     * @param newMetadataURI URI for fresh legal/valuation docs.
     */
    function relistAssetAsFractional(
        uint256 assetId,
        uint128 newValuation,
        string calldata newMetadataURI
    ) external onlyTokenizer whenNotPaused assetExists(assetId) {
        if (newValuation == 0) revert InvalidValuation(0);
        if (bytes(newMetadataURI).length == 0) revert EmptyStringField("metadataURI");

        AssetRecord storage rec = _assets[assetId];
        if (rec.state != AssetState.CLOSED) revert AssetNotClosedForRelisting(assetId, rec.state);
        if (rec.model != OwnershipModel.WHOLE_OWNERSHIP) revert OwnershipModelMismatch(assetId, rec.model);

        rec.state = AssetState.RELISTED;
        rec.model = OwnershipModel.FRACTIONAL;
        rec.valuation = newValuation;
        rec.metadataURI = newMetadataURI;
        rec.soldShares = 0;
        rec.totalShares = 0;
        rec.pricePerShare = 0;
        rec.tokenizedAt = 0;
        uint32 newCount = rec.relistCount + 1;
        rec.relistCount = newCount;
        rec.relistedAt = uint48(block.timestamp);

        emit AssetRelisted(assetId, rec.assetOwner, newValuation, newCount);
    }

    /**
     * @notice Returns the full canonical record for a given asset.
     * @param assetId Identifier of the asset to retrieve.
     * @return rec Complete AssetRecord struct.
     */
    function getAsset(uint256 assetId) external view assetExists(assetId) returns (AssetRecord memory rec) {
        rec = _assets[assetId];
    }

    /**
     * @notice Returns asset IDs currently owned by the given address (current owner only; sold assets are excluded).
     * @param assetOwner Owner address to query.
     * @return ids Array of asset IDs whose assetOwner is the given address.
     */
    function getAssetsByOwner(address assetOwner) external view returns (uint256[] memory ids) {
        uint256[] storage raw = _ownerAssets[assetOwner];
        uint256 count;
        for (uint256 i; i < raw.length; i++) {
            if (_assets[raw[i]].assetOwner == assetOwner) count++;
        }
        ids = new uint256[](count);
        uint256 j;
        for (uint256 i; i < raw.length; i++) {
            if (_assets[raw[i]].assetOwner == assetOwner) ids[j++] = raw[i];
        }
    }

    /**
     * @notice Returns the current state of an asset.
     * @param assetId Asset identifier to query.
     * @return Current AssetState enum value.
     */
    function getAssetState(uint256 assetId) external view assetExists(assetId) returns (AssetState) {
        return _assets[assetId].state;
    }

    /**
     * @notice Returns funding progress for the current offering round (reset on relist).
     * @param assetId Asset to query.
     * @return soldShares Shares purchased in this round.
     * @return totalShares Total shares in this round.
     */
    function getFundingProgress(
        uint256 assetId
    ) external view assetExists(assetId) returns (uint128 soldShares, uint128 totalShares) {
        AssetRecord storage rec = _assets[assetId];
        soldShares = rec.soldShares;
        totalShares = rec.totalShares;
    }

    /**
     * @notice Returns how many times the asset has been relisted (0 = original round).
     * @param assetId Asset to query.
     * @return count Relist count.
     */
    function getRelistCount(uint256 assetId) external view assetExists(assetId) returns (uint32 count) {
        count = _assets[assetId].relistCount;
    }

    /**
     * @notice Returns the total number of assets ever registered.
     * @return count Total registered asset count (all states).
     */
    function totalAssets() external view returns (uint256 count) {
        count = _assetCounter - 1;
    }

    /**
     * @dev Enforces valid FSM transitions; reverts with InvalidStateTransition otherwise.
     * @param assetId Asset id (for revert payload).
     * @param current Current state.
     * @param requested Requested next state.
     */
    function _requireTransition(uint256 assetId, AssetState current, AssetState requested) internal pure {
        bool valid;
        if (current == AssetState.PENDING && requested == AssetState.ACTIVE) valid = true;
        if (current == AssetState.ACTIVE && requested == AssetState.TOKENIZED) valid = true;
        if (current == AssetState.ACTIVE && requested == AssetState.CLOSED) valid = true;
        if (current == AssetState.TOKENIZED && requested == AssetState.CLOSED) valid = true;
        if (current == AssetState.CLOSED && requested == AssetState.RELISTED) valid = true;
        if (current == AssetState.CLOSED && requested == AssetState.ACTIVE) valid = true; // whole-asset relist
        if (current == AssetState.RELISTED && requested == AssetState.TOKENIZED) valid = true;

        if (!valid) revert InvalidStateTransition(assetId, current, requested);
    }

    /////////////////////////////////////////
    //////// OZ Natives /////////////////////
    /////////////////////////////////////////
    /**
     * @dev UUPS hook; restricts upgrades to owner.
     * @param newImplementation New implementation contract address.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Pauses all state-changing operations. Emergency circuit breaker.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Restores normal operation after a pause.
    function unpause() external onlyOwner {
        _unpause();
    }
}
