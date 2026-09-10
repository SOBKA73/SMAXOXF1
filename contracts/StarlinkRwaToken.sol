// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SMAXO Starlink Chad
 * @notice Permissioned ERC-20 representing 20,000 whole RWA participation units.
 *
 * The token has zero decimals: one token equals one 500-XAF participation unit.
 * Transfers require both the sender and receiver to be KYC-whitelisted, except
 * for the constructor mint and any future burn.
 *
 * Dividends use a cumulative-per-token accounting model. This deliberately uses
 * pull claims rather than looping over all holders, so distribution remains safe
 * and viable as the whitelist grows on Arbitrum.
 */
contract StarlinkRwaToken is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant TOTAL_TOKENS = 20_000;
    uint256 public constant TOKEN_NOMINAL_VALUE_XAF = 500;
    uint256 private constant MAGNITUDE = 1e24;

    IERC20 public immutable dividendStablecoin;

    mapping(address => bool) public isWhitelisted;

    uint256 public magnifiedNativeDividendPerShare;
    uint256 public magnifiedStableDividendPerShare;
    mapping(address => int256) private nativeDividendCorrections;
    mapping(address => int256) private stableDividendCorrections;
    mapping(address => uint256) public nativeDividendsClaimed;
    mapping(address => uint256) public stableDividendsClaimed;

    event WhitelistUpdated(address indexed account, bool approved);
    event NativeDividendsDistributed(address indexed payer, uint256 amount);
    event StableDividendsDistributed(address indexed payer, uint256 amount);
    event NativeDividendsClaimed(address indexed account, uint256 amount);
    event StableDividendsClaimed(address indexed account, uint256 amount);

    error NotWhitelisted(address account);
    error ZeroAddress();
    error ZeroAmount();
    error InvalidStablecoin();
    error TransferFailed();
    error AmountExceedsAvailable();

    constructor(address stablecoin_) ERC20("SMAXO Starlink Chad", "SMAXOF1") Ownable(msg.sender) {
        if (stablecoin_ == address(0)) revert InvalidStablecoin();
        dividendStablecoin = IERC20(stablecoin_);
        isWhitelisted[msg.sender] = true;
        emit WhitelistUpdated(msg.sender, true);
        _mint(msg.sender, TOTAL_TOKENS);
    }

    /// @notice One on-chain unit equals one whole 500-XAF participation unit.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /** @notice Approves or revokes one investor after the off-chain KYC check. */
    function setWhitelist(address account, bool approved) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        isWhitelisted[account] = approved;
        emit WhitelistUpdated(account, approved);
    }

    /** @notice Batch whitelist management for operational onboarding. */
    function setWhitelistBatch(address[] calldata accounts, bool approved) external onlyOwner {
        for (uint256 i; i < accounts.length; ++i) {
            if (accounts[i] == address(0)) revert ZeroAddress();
            isWhitelisted[accounts[i]] = approved;
            emit WhitelistUpdated(accounts[i], approved);
        }
    }

    /**
     * @notice Deposits native ETH and allocates it pro rata per token.
     * Native ETH is used as the Arbitrum settlement asset in this implementation.
     */
    function distributeDividends() external payable onlyOwner {
        if (msg.value == 0) revert ZeroAmount();
        magnifiedNativeDividendPerShare += (msg.value * MAGNITUDE) / totalSupply();
        emit NativeDividendsDistributed(msg.sender, msg.value);
    }

    /**
     * @notice Pulls stablecoins from the owner and allocates them pro rata.
     * The owner must approve this contract for `amount` first. `amount` uses
     * the stablecoin's native smallest-unit precision.
     */
    function distributeStablecoin(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        bool ok = dividendStablecoin.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();
        magnifiedStableDividendPerShare += (amount * MAGNITUDE) / totalSupply();
        emit StableDividendsDistributed(msg.sender, amount);
    }

    function claimNativeDividends() external nonReentrant {
        uint256 amount = nativeDividendsOwed(msg.sender);
        if (amount == 0) revert ZeroAmount();
        nativeDividendsClaimed[msg.sender] += amount;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit NativeDividendsClaimed(msg.sender, amount);
    }

    function claimStableDividends() external nonReentrant {
        uint256 amount = stableDividendsOwed(msg.sender);
        if (amount == 0) revert ZeroAmount();
        stableDividendsClaimed[msg.sender] += amount;
        bool ok = dividendStablecoin.transfer(msg.sender, amount);
        if (!ok) revert TransferFailed();
        emit StableDividendsClaimed(msg.sender, amount);
    }

    function nativeDividendsOwed(address account) public view returns (uint256) {
        return _dividendsOwed(
            account,
            magnifiedNativeDividendPerShare,
            nativeDividendCorrections[account],
            nativeDividendsClaimed[account]
        );
    }

    function stableDividendsOwed(address account) public view returns (uint256) {
        return _dividendsOwed(
            account,
            magnifiedStableDividendPerShare,
            stableDividendCorrections[account],
            stableDividendsClaimed[account]
        );
    }

    function _dividendsOwed(
        address account,
        uint256 perShare,
        int256 correction,
        uint256 claimed
    ) internal view returns (uint256) {
        int256 accumulated = int256((balanceOf(account) * perShare) / MAGNITUDE) + correction;
        if (accumulated <= int256(claimed)) return 0;
        return uint256(accumulated) - claimed;
    }

    /** @dev Enforces KYC restrictions and preserves dividend entitlement on transfers. */
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && !isWhitelisted[from]) revert NotWhitelisted(from);
        if (to != address(0) && !isWhitelisted[to]) revert NotWhitelisted(to);

        if (from != address(0)) {
            int256 nativeCorrection = int256(value * magnifiedNativeDividendPerShare);
            int256 stableCorrection = int256(value * magnifiedStableDividendPerShare);
            nativeDividendCorrections[from] += nativeCorrection;
            stableDividendCorrections[from] += stableCorrection;
        }
        if (to != address(0)) {
            int256 nativeCorrection = int256(value * magnifiedNativeDividendPerShare);
            int256 stableCorrection = int256(value * magnifiedStableDividendPerShare);
            nativeDividendCorrections[to] -= nativeCorrection;
            stableDividendCorrections[to] -= stableCorrection;
        }
        super._update(from, to, value);
    }

    receive() external payable {
        revert("Use distributeDividends");
    }
}
