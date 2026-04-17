// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { ERC20PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";

/**
 * @title VaulticFractionalOwnershipToken
 * @author @0xJonaseb11
 * @notice Upgradeable ERC20 representing fractional ownership of a single RWA in the Vaultic Trust protocol.
 * @dev One proxy per tokenized asset; full supply minted at init to InvestmentManager. Decimals 0 (whole shares). UUPS, pausable.
 */
contract VaulticFractionalOwnershipToken is
    Initializable,
    ERC20Upgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuard,
    UUPSUpgradeable
{
    error UnauthorizedMinter(address caller);
    error InsufficientTokenBalance(uint256 requested, uint256 available);
    error InvalidRecipient();
    error ZeroShareDispatch();
    error InvalidInitialSupply();
    error InvalidAssetId();
    error NothingToReclaim();

    event SupplyMinted(uint256 indexed assetId, address indexed recipient, uint256 supply);
    event SharesDispatched(uint256 indexed assetId, address indexed investor, uint256 amount);
    event AllSharesReclaimed(uint256 indexed assetId, uint256 totalReclaimed);
    event MinterUpdated(address indexed previous, address indexed updated);

    uint256 public assetId;
    address public authorizedMinter;
    string public assetName;
    uint256[50] private __gap;

    modifier onlyMinter() {
        if (msg.sender != authorizedMinter) revert UnauthorizedMinter(msg.sender);
        _;
    }

    /**
     * @notice Initializes the token proxy for a specific RWA. Mints full supply to initialHolder; supply is fixed thereafter.
     * @param _assetId Registry identifier for the underlying asset.
     * @param _assetName Human-readable asset name (used in token name).
     * @param _totalSupply Number of indivisible share tokens to mint.
     * @param _initialHolder Address receiving all minted shares (e.g. InvestmentManager).
     * @param _authorizedMinter Address permitted to dispatch and reclaim shares.
     * @param _owner Protocol owner for upgrade and admin.
     */
    function initialize(
        uint256 _assetId,
        string calldata _assetName,
        uint256 _totalSupply,
        address _initialHolder,
        address _authorizedMinter,
        address _owner
    ) external initializer {
        if (_assetId == 0) revert InvalidAssetId();
        if (_totalSupply == 0) revert InvalidInitialSupply();
        if (_initialHolder == address(0)) revert InvalidRecipient();
        if (_authorizedMinter == address(0)) revert UnauthorizedMinter(address(0));

        string memory tokenName = string(abi.encodePacked("Vaultic: ", _assetName));
        string memory tokenSymbol = string(abi.encodePacked("VLT-", _uint256ToString(_assetId)));

        __ERC20_init(tokenName, tokenSymbol);
        __ERC20Pausable_init();
        __Ownable_init(_owner);

        assetId = _assetId;
        assetName = _assetName;
        authorizedMinter = _authorizedMinter;

        _mint(_initialHolder, _totalSupply);

        emit SupplyMinted(_assetId, _initialHolder, _totalSupply);
    }

    /**
     * @notice Transfers shares from the minter's balance to an investor. Minter-only.
     * @param investor Destination address for the dispatched shares.
     * @param amount Number of shares to send.
     */
    function dispatchShares(address investor, uint256 amount) external onlyMinter nonReentrant whenNotPaused {
        if (investor == address(0)) revert InvalidRecipient();
        if (amount == 0) revert ZeroShareDispatch();

        uint256 available = balanceOf(msg.sender);
        if (amount > available) revert InsufficientTokenBalance(amount, available);

        _transfer(msg.sender, investor, amount);

        emit SharesDispatched(assetId, investor, amount);
    }

    /**
     * @notice Pulls all outstanding shares from the given holders back to the minter (for relisting). Minter-only.
     * @param holders Array of addresses that currently hold shares (supplied by InvestmentManager).
     * @return reclaimed Total number of shares pulled back to the minter.
     */
    function reclaimAllShares(
        address[] calldata holders
    ) external onlyMinter nonReentrant whenNotPaused returns (uint256 reclaimed) {
        uint256 minterBalance = balanceOf(msg.sender);
        uint256 supply = totalSupply();
        if (minterBalance == supply) revert NothingToReclaim();

        address minter = msg.sender;
        uint256 len = holders.length;

        for (uint256 i; i < len; ) {
            address holder = holders[i];
            uint256 balance = balanceOf(holder);
            if (balance != 0) {
                _transfer(holder, minter, balance);
                reclaimed += balance;
            }

            unchecked {
                ++i;
            }
        }

        emit AllSharesReclaimed(assetId, reclaimed);
    }

    /**
     * @notice Reassigns the authorized minter. Owner-only (e.g. when upgrading InvestmentManager).
     * @param newMinter New address to grant minter role.
     */
    function setAuthorizedMinter(address newMinter) external onlyOwner {
        if (newMinter == address(0)) revert UnauthorizedMinter(address(0));
        address prev = authorizedMinter;
        authorizedMinter = newMinter;
        emit MinterUpdated(prev, newMinter);
    }

    /// @notice Pauses all token transfers.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Restores normal token transfer functionality.
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Returns the number of decimal places (0 — whole shares only).
     * @return 0 always.
     */
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /**
     * @notice Returns shares still held by the minter (undispatched).
     * @return remaining Balance of authorizedMinter.
     */
    function remainingShares() external view returns (uint256 remaining) {
        remaining = balanceOf(authorizedMinter);
    }

    /// @dev Resolves ERC20Upgradeable / ERC20PausableUpgradeable inheritance; enforces pause on transfer.
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._update(from, to, value);
    }

    /**
     * @dev UUPS hook; restricts upgrades to owner.
     * @param newImplementation New implementation contract address.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Converts uint256 to decimal string (for token symbol at init).
     * @param value The integer to convert.
     * @return str Decimal string representation.
     */
    function _uint256ToString(uint256 value) internal pure returns (string memory str) {
        if (value == 0) return "0";

        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        str = string(buffer);
    }
}
