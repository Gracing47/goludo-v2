// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/**
 * @title LudoVault
 * @author GoLudo Team
 * @notice ESCROW VAULT FOR GOLUDO P2P & MULTIPLAYER WAGERING GAMES
 * @dev Supports 2, 3, or 4 players. Holds NATIVE currency (C2FLR/FLR) deposits.
 *
 * SECURITY NOTES (PROD-6 / AAA-C1/C2):
 *  - claimPayout enforces amount == room.pot so the signed `amount` can never
 *    exceed the on-chain balance belonging to that room.
 *  - Pausable with a separate guardian role so the contract can be halted
 *    without handing the guardian owner-level power.
 *  - emergencyWithdraw covers both ACTIVE rooms (timeout) and WAITING rooms
 *    that never filled after ROOM_TIMEOUT, so stake is always recoverable.
 */

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract LudoVault is ReentrancyGuard, Ownable2Step, Pausable, EIP712 {
    using ECDSA for bytes32;

    // ============================================
    // CONSTANTS
    // ============================================

    uint256 public constant MAX_FEE_BPS = 1000;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant EMERGENCY_DELAY = 24 hours;
    uint256 public constant ROOM_TIMEOUT = 3 minutes;

    bytes32 public constant PAYOUT_TYPEHASH =
        keccak256(
            "Payout(bytes32 roomId,address winner,uint256 amount,uint256 nonce,uint256 deadline)"
        );

    // ============================================
    // STATE VARIABLES
    // ============================================

    address public signer;
    uint256 public feeBps;
    address public treasury;

    /// @notice Separate guardian that may pause/unpause but cannot change fees or signer.
    address public guardian;

    mapping(bytes32 => bool) public usedNonces;

    // ============================================
    // ROOM STRUCTURE
    // ============================================

    enum RoomStatus {
        EMPTY,
        WAITING,
        ACTIVE,
        FINISHED,
        CANCELLED
    }

    struct Room {
        address creator;
        address[] participants; // Includes creator at index 0
        uint256 maxPlayers;
        uint256 entryAmount;
        uint256 pot;
        uint256 createdAt;
        RoomStatus status;
    }

    mapping(bytes32 => Room) public rooms;

    // ============================================
    // EVENTS
    // ============================================

    // Room lifecycle events
    event RoomCreated(
        bytes32 indexed roomId,
        address indexed creator,
        uint256 entryAmount,
        uint256 maxPlayers
    );
    event RoomJoined(
        bytes32 indexed roomId,
        address indexed player,
        uint256 currentPot,
        uint256 playersJoined
    );
    event RoomCancelled(
        bytes32 indexed roomId,
        address indexed creator,
        uint256 refundAmount
    );
    event GameFinished(
        bytes32 indexed roomId,
        address indexed winner,
        uint256 payout,
        uint256 fee
    );
    event EmergencyWithdraw(
        bytes32 indexed roomId,
        address indexed player,
        uint256 amount
    );

    // Admin events for monitoring
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );
    event GuardianUpdated(
        address indexed oldGuardian,
        address indexed newGuardian
    );

    // ============================================
    // ERRORS
    // ============================================

    error InvalidAddress();
    error InvalidAmount();
    error InvalidFee();
    error InvalidSignature();
    error InvalidRoomStatus();
    error RoomNotFound();
    error NotRoomParticipant();
    error AlreadyJoined();
    error RoomFull();
    error DeadlineExpired();
    error NonceAlreadyUsed();
    error EmergencyDelayNotPassed();
    error TransferFailed();
    error NotGuardian();
    /// @dev Raised when the signed `amount` does not equal room.pot (would drain vault).
    error AmountExceedsPot();

    // ============================================
    // MODIFIERS
    // ============================================

    /// @notice Either the owner or the guardian may pause; only owner can unpause.
    modifier onlyGuardianOrOwner() {
        if (msg.sender != guardian && msg.sender != owner()) revert NotGuardian();
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor(
        address _signer,
        address _treasury,
        uint256 _feeBps
    ) Ownable(msg.sender) EIP712("LudoVault", "1") {
        if (_signer == address(0) || _treasury == address(0))
            revert InvalidAddress();
        if (_feeBps > MAX_FEE_BPS) revert InvalidFee();
        signer = _signer;
        treasury = _treasury;
        feeBps = _feeBps;
        // Default guardian to owner until explicitly changed.
        guardian = msg.sender;
    }

    // ============================================
    // PAUSE CONTROL
    // ============================================

    /// @notice Guardian or owner may pause. Only owner may unpause.
    function pause() external onlyGuardianOrOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============================================
    // ROOM MANAGEMENT
    // ============================================

    function createRoom(
        bytes32 roomId,
        uint256 entryAmount,
        uint256 maxPlayers
    ) external payable nonReentrant whenNotPaused {
        if (msg.value == 0 || msg.value != entryAmount) revert InvalidAmount();
        if (maxPlayers < 2 || maxPlayers > 4) revert InvalidAmount();
        if (rooms[roomId].status != RoomStatus.EMPTY)
            revert InvalidRoomStatus();

        Room storage room = rooms[roomId];
        room.creator = msg.sender;
        room.participants.push(msg.sender);
        room.maxPlayers = maxPlayers;
        room.entryAmount = msg.value;
        room.pot = msg.value;
        room.createdAt = block.timestamp;
        room.status = RoomStatus.WAITING;

        emit RoomCreated(roomId, msg.sender, msg.value, maxPlayers);
    }

    function joinRoom(bytes32 roomId) external payable nonReentrant whenNotPaused {
        Room storage room = rooms[roomId];

        if (room.status != RoomStatus.WAITING) revert InvalidRoomStatus();
        if (msg.value != room.entryAmount) revert InvalidAmount();
        if (room.participants.length >= room.maxPlayers) revert RoomFull();

        // Check if already in room
        for (uint256 i = 0; i < room.participants.length; i++) {
            if (room.participants[i] == msg.sender) revert AlreadyJoined();
        }

        room.participants.push(msg.sender);
        room.pot += msg.value;

        if (room.participants.length == room.maxPlayers) {
            room.status = RoomStatus.ACTIVE;
        }

        emit RoomJoined(roomId, msg.sender, room.pot, room.participants.length);
    }

    function cancelRoom(bytes32 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        if (room.status != RoomStatus.WAITING) revert InvalidRoomStatus();
        if (room.creator != msg.sender) revert NotRoomParticipant();

        uint256 totalRefund = room.pot;
        address[] memory toRefund = room.participants;

        room.status = RoomStatus.CANCELLED;
        room.pot = 0;

        uint256 refundPerPlayer = room.entryAmount;
        for (uint256 i = 0; i < toRefund.length; i++) {
            (bool success, ) = payable(toRefund[i]).call{
                value: refundPerPlayer
            }("");
            if (!success) revert TransferFailed();
        }

        emit RoomCancelled(roomId, msg.sender, totalRefund);
    }

    // ============================================
    // PAYOUT (SERVER-SIGNED)
    // ============================================

    /**
     * @notice Claim the winner payout for a finished game.
     *
     * SECURITY (PROD-6 / AAA-C1):
     *   `amount` in the signature MUST equal room.pot exactly.  This prevents
     *   a compromised signer from draining other rooms' funds because the
     *   contract enforces the upper bound on-chain, independent of the signer.
     *
     *   fee + payout are both taken from room.pot only — no external value used.
     */
    function claimPayout(
        bytes32 roomId,
        address winner,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        if (block.timestamp > deadline) revert DeadlineExpired();
        bytes32 nonceKey = keccak256(abi.encodePacked(roomId, nonce));
        if (usedNonces[nonceKey]) revert NonceAlreadyUsed();

        Room storage room = rooms[roomId];
        if (room.status != RoomStatus.ACTIVE) revert InvalidRoomStatus();

        // --- PROD-6 / AAA-C1: Pot-bound enforcement ---
        // `amount` must equal room.pot so the signer cannot reference a value
        // larger than this room's actual on-chain balance.
        if (amount != room.pot) revert AmountExceedsPot();

        // Verify winner is a participant
        bool isParticipant = false;
        for (uint256 i = 0; i < room.participants.length; i++) {
            if (room.participants[i] == winner) {
                isParticipant = true;
                break;
            }
        }
        if (!isParticipant) revert NotRoomParticipant();

        bytes32 structHash = keccak256(
            abi.encode(PAYOUT_TYPEHASH, roomId, winner, amount, nonce, deadline)
        );
        address recoveredSigner = _hashTypedDataV4(structHash).recover(
            signature
        );
        if (recoveredSigner != signer) revert InvalidSignature();

        usedNonces[nonceKey] = true;
        room.status = RoomStatus.FINISHED;

        // Compute fee and payout from room.pot (== amount, verified above).
        uint256 potSnapshot = room.pot;
        room.pot = 0;

        uint256 fee = (potSnapshot * feeBps) / BPS_DENOMINATOR;
        uint256 payout = potSnapshot - fee;

        if (fee > 0) {
            (bool fSuccess, ) = payable(treasury).call{value: fee}("");
            if (!fSuccess) revert TransferFailed();
        }
        (bool wSuccess, ) = payable(winner).call{value: payout}("");
        if (!wSuccess) revert TransferFailed();

        emit GameFinished(roomId, winner, payout, fee);
    }

    /**
     * @notice Emergency refund path — covers both ACTIVE (payout never arrived)
     *         and WAITING (room never filled) rooms, after the appropriate delay.
     *
     * WAITING rooms: refundable after ROOM_TIMEOUT (3 minutes) — any participant
     *   may call.  This covers the case where the game never started and the
     *   creator is unreachable / not calling cancelRoom.
     *
     * ACTIVE rooms: refundable after EMERGENCY_DELAY (24 hours) — payout window
     *   missed, stake recoverable by anyone.
     */
    function emergencyWithdraw(bytes32 roomId) external nonReentrant {
        Room storage room = rooms[roomId];

        bool isWaiting = room.status == RoomStatus.WAITING;
        bool isActive  = room.status == RoomStatus.ACTIVE;

        if (!isWaiting && !isActive) revert InvalidRoomStatus();

        // Enforce caller is a participant
        bool callerIsParticipant = false;
        for (uint256 i = 0; i < room.participants.length; i++) {
            if (room.participants[i] == msg.sender) {
                callerIsParticipant = true;
                break;
            }
        }
        if (!callerIsParticipant) revert NotRoomParticipant();

        if (isWaiting) {
            // Waiting rooms: timeout is ROOM_TIMEOUT (short — 3 minutes)
            if (block.timestamp < room.createdAt + ROOM_TIMEOUT)
                revert EmergencyDelayNotPassed();
        } else {
            // Active rooms: timeout is EMERGENCY_DELAY (24 hours)
            if (block.timestamp < room.createdAt + EMERGENCY_DELAY)
                revert EmergencyDelayNotPassed();
        }

        address[] memory participants = room.participants;
        uint256 refundPerPlayer = room.entryAmount;

        room.status = RoomStatus.CANCELLED;
        room.pot = 0;

        for (uint256 i = 0; i < participants.length; i++) {
            (bool success, ) = payable(participants[i]).call{
                value: refundPerPlayer
            }("");
            if (!success) revert TransferFailed();
            emit EmergencyWithdraw(roomId, participants[i], refundPerPlayer);
        }
    }

    // ============================================
    // ADMIN & VIEW FUNCTIONS
    // ============================================

    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidAddress();
        address oldSigner = signer;
        signer = newSigner;
        emit SignerUpdated(oldSigner, newSigner);
    }

    function setFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert InvalidFee();
        uint256 oldFee = feeBps;
        feeBps = newFeeBps;
        emit FeeUpdated(oldFee, newFeeBps);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @notice Owner assigns a guardian address (distinct from owner) for pause rights.
    function setGuardian(address newGuardian) external onlyOwner {
        if (newGuardian == address(0)) revert InvalidAddress();
        address oldGuardian = guardian;
        guardian = newGuardian;
        emit GuardianUpdated(oldGuardian, newGuardian);
    }

    function getRoom(bytes32 roomId) external view returns (Room memory) {
        return rooms[roomId];
    }

    function getParticipants(
        bytes32 roomId
    ) external view returns (address[] memory) {
        return rooms[roomId].participants;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
