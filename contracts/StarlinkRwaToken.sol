// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title SMAXO Starlink Chad
 * @notice Permissioned ERC-20 representing 20,000 whole RWA participation units.
 * @dev Whitelist approvals can be submitted gaslessly from an EIP-712 owner signature.
 * Emergency recovery requires an explicit owner proposal and guardian confirmation.
 */
contract StarlinkRwaToken is ERC20, Ownable, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    uint256 public constant TOTAL_TOKENS = 20_000;
    uint256 public constant TOKEN_NOMINAL_VALUE_XAF = 500;
    uint256 private constant MAGNITUDE = 1e24;
    bytes32 public constant WHITELIST_TYPEHASH = keccak256("Whitelist(address account,bool approved,uint256 nonce,uint256 deadline)");

    IERC20 public immutable dividendStablecoin;
    mapping(address => bool) public isWhitelisted;
    mapping(address => uint256) public whitelistNonces;
    address public guardian;
    bytes32 public pendingRecoveryHash;
    mapping(bytes32 => bool) public recoveryApprovals;

    uint256 public magnifiedNativeDividendPerShare;
    uint256 public magnifiedStableDividendPerShare;
    mapping(address => int256) private nativeDividendCorrections;
    mapping(address => int256) private stableDividendCorrections;
    mapping(address => uint256) public nativeDividendsClaimed;
    mapping(address => uint256) public stableDividendsClaimed;
    bool private emergencyRecoveryInProgress;

    event WhitelistUpdated(address indexed account, bool approved);
    event WhitelistUpdatedBySignature(address indexed account, bool approved, uint256 nonce, address indexed relayer);
    event GuardianUpdated(address indexed previousGuardian, address indexed newGuardian);
    event EmergencyRecoveryProposed(bytes32 indexed recoveryHash, address indexed lostAddress, address indexed newAddress);
    event EmergencyRecoveryConfirmed(bytes32 indexed recoveryHash, address indexed guardian);
    event NativeDividendsDistributed(address indexed payer, uint256 amount);
    event StableDividendsDistributed(address indexed payer, uint256 amount);
    event NativeDividendsClaimed(address indexed account, uint256 amount);
    event StableDividendsClaimed(address indexed account, uint256 amount);
    event EmergencyTokensRecovered(address indexed lostAddress, address indexed newAddress, uint256 amount);

    error NotWhitelisted(address account);
    error ZeroAddress();
    error ZeroAmount();
    error InvalidStablecoin();
    error TransferFailed();
    error SignatureExpired();
    error InvalidWhitelistSignature();
    error GuardianRequired();
    error RecoveryNotProposed();
    error RecoveryNotConfirmed();

    constructor(address stablecoin_)
        ERC20("SMAXO Starlink Chad", "SMAXOF1")
        Ownable(msg.sender)
        EIP712("SMAXO Starlink Chad", "1")
    {
        if (stablecoin_ == address(0)) revert InvalidStablecoin();
        dividendStablecoin = IERC20(stablecoin_);
        isWhitelisted[msg.sender] = true;
        emit WhitelistUpdated(msg.sender, true);
        _mint(msg.sender, TOTAL_TOKENS);
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function setWhitelist(address account, bool approved) external onlyOwner {
        _setWhitelist(account, approved);
    }

    function setWhitelistBatch(address[] calldata accounts, bool approved) external onlyOwner {
        for (uint256 i; i < accounts.length; ++i) {
            _setWhitelist(accounts[i], approved);
        }
    }

    /** @notice Submit an owner-signed whitelist decision without requiring an owner transaction. */
    function whitelistWithSig(
        address account,
        bool approved,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        if (block.timestamp > deadline) revert SignatureExpired();
        uint256 nonce = whitelistNonces[account];
        bytes32 structHash = keccak256(abi.encode(WHITELIST_TYPEHASH, account, approved, nonce, deadline));
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), v, r, s);
        if (signer != owner()) revert InvalidWhitelistSignature();
        whitelistNonces[account] = nonce + 1;
        _setWhitelist(account, approved);
        emit WhitelistUpdatedBySignature(account, approved, nonce, msg.sender);
    }

    function setGuardian(address newGuardian) external onlyOwner {
        if (newGuardian == address(0) || newGuardian == owner()) revert GuardianRequired();
        emit GuardianUpdated(guardian, newGuardian);
        guardian = newGuardian;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function proposeEmergencyRecovery(address lostAddress, address newAddress)
        external
        onlyOwner
        whenPaused
    {
        if (guardian == address(0)) revert GuardianRequired();
        bytes32 recoveryHash = keccak256(abi.encode(address(this), block.chainid, lostAddress, newAddress, block.timestamp));
        pendingRecoveryHash = recoveryHash;
        emit EmergencyRecoveryProposed(recoveryHash, lostAddress, newAddress);
    }

    function confirmEmergencyRecovery(address lostAddress, address newAddress, uint256 proposedAt)
        external
        whenPaused
    {
        if (msg.sender != guardian) revert GuardianRequired();
        bytes32 recoveryHash = keccak256(abi.encode(address(this), block.chainid, lostAddress, newAddress, proposedAt));
        if (recoveryHash != pendingRecoveryHash) revert RecoveryNotProposed();
        recoveryApprovals[recoveryHash] = true;
        emit EmergencyRecoveryConfirmed(recoveryHash, msg.sender);
    }

    /**
     * @notice Execute a recovery only after owner proposal and guardian confirmation.
     * proposedAt must be the timestamp used to create the pending proposal.
     */
    function emergencyRecoverTokens(address lostAddress, address newAddress, uint256 proposedAt)
        external
        onlyOwner
        whenPaused
    {
        if (lostAddress == address(0) || newAddress == address(0)) revert ZeroAddress();
        if (!isWhitelisted[lostAddress]) revert NotWhitelisted(lostAddress);
        if (!isWhitelisted[newAddress]) revert NotWhitelisted(newAddress);
        bytes32 recoveryHash = keccak256(abi.encode(address(this), block.chainid, lostAddress, newAddress, proposedAt));
        if (recoveryHash != pendingRecoveryHash) revert RecoveryNotProposed();
        if (!recoveryApprovals[recoveryHash]) revert RecoveryNotConfirmed();
        uint256 amount = balanceOf(lostAddress);
        if (amount == 0) revert ZeroAmount();

        delete recoveryApprovals[recoveryHash];
        delete pendingRecoveryHash;
        emergencyRecoveryInProgress = true;
        _update(lostAddress, newAddress, amount);
        emergencyRecoveryInProgress = false;
        emit EmergencyTokensRecovered(lostAddress, newAddress, amount);
    }

    function distributeDividends() external payable onlyOwner {
        if (msg.value == 0) revert ZeroAmount();
        magnifiedNativeDividendPerShare += (msg.value * MAGNITUDE) / totalSupply();
        emit NativeDividendsDistributed(msg.sender, msg.value);
    }

    function distributeStablecoin(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        dividendStablecoin.safeTransferFrom(msg.sender, address(this), amount);
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
        dividendStablecoin.safeTransfer(msg.sender, amount);
        emit StableDividendsClaimed(msg.sender, amount);
    }

    function nativeDividendsOwed(address account) public view returns (uint256) {
        return _dividendsOwed(account, magnifiedNativeDividendPerShare, nativeDividendCorrections[account], nativeDividendsClaimed[account]);
    }

    function stableDividendsOwed(address account) public view returns (uint256) {
        return _dividendsOwed(account, magnifiedStableDividendPerShare, stableDividendCorrections[account], stableDividendsClaimed[account]);
    }

    function _dividendsOwed(address account, uint256 perShare, int256 correction, uint256 claimed)
        internal
        view
        returns (uint256)
    {
        int256 accumulated = int256((balanceOf(account) * perShare) / MAGNITUDE) + correction;
        if (accumulated <= int256(claimed)) return 0;
        return uint256(accumulated) - claimed;
    }

    function _setWhitelist(address account, bool approved) internal {
        if (account == address(0)) revert ZeroAddress();
        isWhitelisted[account] = approved;
        emit WhitelistUpdated(account, approved);
    }

    /** @dev Applies KYC restrictions, pause state, and dividend corrections. */
    function _update(address from, address to, uint256 value) internal override {
        if (paused() && !emergencyRecoveryInProgress) revert EnforcedPause();
        if (from != address(0) && !isWhitelisted[from]) revert NotWhitelisted(from);
        if (to != address(0) && !isWhitelisted[to]) revert NotWhitelisted(to);

        if (from != address(0)) {
            nativeDividendCorrections[from] += int256(value * magnifiedNativeDividendPerShare);
            stableDividendCorrections[from] += int256(value * magnifiedStableDividendPerShare);
        }
        if (to != address(0)) {
            nativeDividendCorrections[to] -= int256(value * magnifiedNativeDividendPerShare);
            stableDividendCorrections[to] -= int256(value * magnifiedStableDividendPerShare);
        }
        super._update(from, to, value);
    }

    receive() external payable {
        revert("Use distributeDividends");
    }
}
