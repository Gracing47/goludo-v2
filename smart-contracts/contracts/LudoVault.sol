// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/**
 * @title LudoVault
 * @author GoLudo Team
 * @notice Escrow Vault for GoLudo P2P Wagering Games
 * @dev Holds NATIVE currency (C2FLR/FLR) deposits, releases funds based on server-signed results
 * 
 * ARCHITECTURE:
 * - Off-chain game logic (fast, real-time)
 * - On-chain fund custody (secure, trustless)
 * - Server signs winner via EIP-712
 * - Emergency withdraw after 24h (audit requirement)
 * 
 * SECURITY:
 * - ReentrancyGuard on all state-changing functions
 * - Checks-Effects-Interactions pattern
 * - Ownable2Step for secure admin transfer
 * - EIP-712 typed signatures for oracle verification
 */

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract LudoVault is ReentrancyGuard, Ownable2Step, EIP712 {
    using ECDSA for bytes32;

    // ============================================
    // CONSTANTS
    // ============================================

    /// @notice Maximum platform fee (10% = 1000 basis points)
    uint256 public constant MAX_FEE_BPS = 1000;
    
    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    /// @notice Emergency withdraw delay (24 hours)
    uint256 public constant EMERGENCY_DELAY = 24 hours;
    
    /// @notice Room timeout (3 minutes for join, enforced off-chain for gameplay)
    uint256 public constant ROOM_TIMEOUT = 3 minutes;

    /// @notice EIP-712 TypeHash for Payout struct
    bytes32 public constant PAYOUT_TYPEHASH = keccak256(
        "Payout(bytes32 roomId,address winner,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Trusted signer address (game server)
    address public signer;
    
    /// @notice Platform fee in basis points (e.g., 250 = 2.5%)
    uint256 public feeBps;
    
    /// @notice Treasury address for fee collection
    address public treasury;
    
    /// @notice Nonce for replay protection
    mapping(bytes32 => bool) public usedNonces;

    // ============================================
    // ROOM STRUCTURE
    // ============================================

    enum RoomStatus {
        EMPTY,      // Room doesn't exist
        WAITING,    // Creator deposited, waiting for opponent
        ACTIVE,     // Both players deposited, game in progress
        FINISHED,   // Game ended, funds distributed
        CANCELLED   // Room cancelled, funds returned
    }

    struct Room {
        address creator;
        address opponent;
        uint256 entryAmount;
        uint256 pot;
        uint256 createdAt;
        RoomStatus status;
    }

    /// @notice All rooms indexed by roomId
    mapping(bytes32 => Room) public rooms;

    // ============================================
    // EVENTS
    // ============================================

    event RoomCreated(
        bytes32 indexed roomId, 
        address indexed creator, 
        uint256 entryAmount
    );
    
    event RoomJoined(
        bytes32 indexed roomId, 
        address indexed opponent, 
        uint256 totalPot
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
    
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

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
    error DeadlineExpired();
    error NonceAlreadyUsed();
    error EmergencyDelayNotPassed();
    error TransferFailed();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Deploy LudoVault with configuration
     * @param _signer Trusted server wallet for signing payouts
     * @param _treasury Address to receive platform fees
     * @param _feeBps Initial fee in basis points (max 1000 = 10%)
     */
    constructor(
        address _signer,
        address _treasury,
        uint256 _feeBps
    ) 
        Ownable(msg.sender) 
        EIP712("LudoVault", "1")
    {
        if (_signer == address(0)) revert InvalidAddress();
        if (_treasury == address(0)) revert InvalidAddress();
        if (_feeBps > MAX_FEE_BPS) revert InvalidFee();

        signer = _signer;
        treasury = _treasury;
        feeBps = _feeBps;
    }

    // ============================================
    // ROOM MANAGEMENT
    // ============================================

    /**
     * @notice Create a new game room and deposit native entry amount
     * @param roomId Unique room identifier (generated off-chain)
     * @param entryAmount Expected amount each player must deposit (verified against msg.value)
     */
    function createRoom(
        bytes32 roomId, 
        uint256 entryAmount
    ) external payable nonReentrant {
        if (msg.value == 0 || msg.value != entryAmount) revert InvalidAmount();
        if (rooms[roomId].status != RoomStatus.EMPTY) revert InvalidRoomStatus();

        rooms[roomId] = Room({
            creator: msg.sender,
            opponent: address(0),
            entryAmount: msg.value,
            pot: msg.value,
            createdAt: block.timestamp,
            status: RoomStatus.WAITING
        });

        emit RoomCreated(roomId, msg.sender, msg.value);
    }

    /**
     * @notice Join an existing room by depositing native entry amount
     * @param roomId Room to join
     */
    function joinRoom(bytes32 roomId) external payable nonReentrant {
        Room storage room = rooms[roomId];
        
        if (room.status != RoomStatus.WAITING) revert InvalidRoomStatus();
        if (room.creator == msg.sender) revert NotRoomParticipant();
        if (msg.value != room.entryAmount) revert InvalidAmount();

        room.opponent = msg.sender;
        room.pot += msg.value;
        room.status = RoomStatus.ACTIVE;

        emit RoomJoined(roomId, msg.sender, room.pot);
    }

    /**
     * @notice Cancel room and withdraw deposit (only creator, only if waiting)
     * @param roomId Room to cancel
     */
    function cancelRoom(bytes32 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        
        if (room.status != RoomStatus.WAITING) revert InvalidRoomStatus();
        if (room.creator != msg.sender) revert NotRoomParticipant();

        uint256 refundAmount = room.pot;

        room.status = RoomStatus.CANCELLED;
        room.pot = 0;

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        if (!success) revert TransferFailed();

        emit RoomCancelled(roomId, msg.sender, refundAmount);
    }

    // ============================================
    // PAYOUT (SERVER-SIGNED)
    // ============================================

    /**
     * @notice Claim winnings using server-signed payout authorization
     * @param roomId Room ID
     * @param winner Winner's address
     * @param amount Gross payout amount (before fee)
     * @param nonce Unique nonce for replay protection
     * @param deadline Signature expiration timestamp
     * @param signature Server's EIP-712 signature
     */
    function claimPayout(
        bytes32 roomId,
        address winner,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert DeadlineExpired();
        
        bytes32 nonceKey = keccak256(abi.encodePacked(roomId, nonce));
        if (usedNonces[nonceKey]) revert NonceAlreadyUsed();

        Room storage room = rooms[roomId];
        if (room.status != RoomStatus.ACTIVE) revert InvalidRoomStatus();
        if (winner != room.creator && winner != room.opponent) revert NotRoomParticipant();

        bytes32 structHash = keccak256(abi.encode(
            PAYOUT_TYPEHASH,
            roomId,
            winner,
            amount,
            nonce,
            deadline
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address recoveredSigner = digest.recover(signature);
        
        if (recoveredSigner != signer) revert InvalidSignature();

        usedNonces[nonceKey] = true;
        room.status = RoomStatus.FINISHED;

        uint256 fee = (amount * feeBps) / BPS_DENOMINATOR;
        uint256 payout = amount - fee;

        room.pot = 0;

        if (fee > 0) {
            (bool fSuccess, ) = payable(treasury).call{value: fee}("");
            if (!fSuccess) revert TransferFailed();
        }
        
        (bool wSuccess, ) = payable(winner).call{value: payout}("");
        if (!wSuccess) revert TransferFailed();

        emit GameFinished(roomId, winner, payout, fee);
    }

    // ============================================
    // EMERGENCY WITHDRAW
    // ============================================

    /**
     * @notice Emergency withdraw if game stuck for 24+ hours
     * @param roomId Room ID
     */
    function emergencyWithdraw(bytes32 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        
        if (room.status != RoomStatus.ACTIVE) revert InvalidRoomStatus();
        if (msg.sender != room.creator && msg.sender != room.opponent) {
            revert NotRoomParticipant();
        }
        if (block.timestamp < room.createdAt + EMERGENCY_DELAY) {
            revert EmergencyDelayNotPassed();
        }

        uint256 refundPerPlayer = room.entryAmount;
        address creator = room.creator;
        address opponent = room.opponent;

        room.status = RoomStatus.CANCELLED;
        room.pot = 0;

        (bool cSuccess, ) = payable(creator).call{value: refundPerPlayer}("");
        (bool oSuccess, ) = payable(opponent).call{value: refundPerPlayer}("");
        
        if (!cSuccess || !oSuccess) revert TransferFailed();

        emit EmergencyWithdraw(roomId, creator, refundPerPlayer);
        emit EmergencyWithdraw(roomId, opponent, refundPerPlayer);
    }

    // ============================================
    // ADMIN FUNCTIONS
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

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getRoom(bytes32 roomId) external view returns (Room memory) {
        return rooms[roomId];
    }

    function canEmergencyWithdraw(bytes32 roomId) external view returns (bool) {
        Room storage room = rooms[roomId];
        return (
            room.status == RoomStatus.ACTIVE &&
            block.timestamp >= room.createdAt + EMERGENCY_DELAY
        );
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
