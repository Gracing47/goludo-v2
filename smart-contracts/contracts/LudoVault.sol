// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/**
 * @title LudoVault
 * @author GoLudo Team
 * @notice ESCROW VAULT FOR GOLUDO P2P & MULTIPLAYER GAMES — $GO ERC-20 EDITION
 * @dev Supports 2, 3, or 4 players. Holds the $GO ERC-20 token (not native currency).
 *
 * TOKENOMICS (Season 1, Testnet):
 *  - Entry stakes are pulled in $GO via transferFrom (player must approve first).
 *  - On a server-signed win, a `feeBps` protocol fee (default 5%) is taken from the pot.
 *  - Optional affiliate: if a room carries an affiliate, `affiliateBps` (default 1% of pot)
 *    is redirected to that address out of the fee before the split.
 *  - The remaining fee is split 50 / 30 / 20 into BURN / SEASON POOL / TREASURY.
 *  - The burn is a REAL supply burn (ERC20Burnable.burn), so totalSupply shrinks — this is
 *    the deflationary core, stronger than a soft-burn to a dead address.
 *
 * SECURITY (carried over from the native edition):
 *  - claimPayout enforces amount == room.pot so the signed amount can never exceed the
 *    room's actual escrowed balance (a compromised signer cannot drain other rooms).
 *  - Pausable with a separate guardian role (halt without owner-level power).
 *  - Reentrancy guarded; token moves use SafeERC20.
 *  - emergencyWithdraw covers ACTIVE (payout missed) and WAITING (never filled) rooms.
 *  - Fee split is exact: payout + affiliate + burn + season + treasury == pot (dust to treasury).
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @dev Minimal burn surface of $GO (ERC20Burnable).
interface IGoTokenBurn {
    function burn(uint256 amount) external;
}

contract LudoVault is ReentrancyGuard, Ownable2Step, Pausable, EIP712 {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    // ============================================
    // CONSTANTS
    // ============================================

    uint256 public constant MAX_FEE_BPS = 1000; // 10% hard ceiling
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant EMERGENCY_DELAY = 24 hours;
    uint256 public constant ROOM_TIMEOUT = 3 minutes;

    /// @notice Fee split of the (post-affiliate) fee: 50% burn, 30% season, remainder (20%) treasury.
    uint256 public constant BURN_SHARE = 50;
    uint256 public constant SEASON_SHARE = 30;

    bytes32 public constant PAYOUT_TYPEHASH =
        keccak256(
            "Payout(bytes32 roomId,address winner,uint256 amount,uint256 nonce,uint256 deadline)"
        );

    // ============================================
    // IMMUTABLES
    // ============================================

    /// @notice The $GO token this vault escrows and burns.
    IERC20 public immutable goToken;

    // ============================================
    // STATE VARIABLES
    // ============================================

    address public signer;
    uint256 public feeBps; // total protocol fee (default 500 = 5%)
    uint256 public affiliateBps; // affiliate cut of the pot (default 100 = 1%), <= feeBps
    address public treasury;
    address public seasonPool; // isolated vault that self-funds seasonal leaderboard rewards
    address public guardian;

    mapping(bytes32 => bool) public usedNonces;

    /// @notice Cumulative $GO permanently burned via fee splits (for the burn dashboard).
    uint256 public totalBurned;

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
        address[] participants;
        uint256 maxPlayers;
        uint256 entryAmount;
        uint256 pot;
        uint256 createdAt;
        address affiliate; // optional influencer referral; address(0) = none
        RoomStatus status;
    }

    mapping(bytes32 => Room) public rooms;

    // ============================================
    // EVENTS
    // ============================================

    event RoomCreated(
        bytes32 indexed roomId,
        address indexed creator,
        uint256 entryAmount,
        uint256 maxPlayers,
        address affiliate
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
    event FeesDistributed(
        bytes32 indexed roomId,
        uint256 burned,
        uint256 toSeasonPool,
        uint256 toTreasury,
        uint256 toAffiliate
    );
    event EmergencyWithdraw(
        bytes32 indexed roomId,
        address indexed player,
        uint256 amount
    );

    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event AffiliateBpsUpdated(uint256 oldBps, uint256 newBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event SeasonPoolUpdated(address indexed oldPool, address indexed newPool);
    event GuardianUpdated(address indexed oldGuardian, address indexed newGuardian);

    // ============================================
    // ERRORS
    // ============================================

    error InvalidAddress();
    error InvalidAmount();
    error InvalidFee();
    error InvalidSignature();
    error InvalidRoomStatus();
    error NotRoomParticipant();
    error AlreadyJoined();
    error RoomFull();
    error DeadlineExpired();
    error NonceAlreadyUsed();
    error EmergencyDelayNotPassed();
    error NotGuardian();
    error SelfAffiliate();
    /// @dev Raised when the signed `amount` does not equal room.pot (would drain vault).
    error AmountExceedsPot();

    // ============================================
    // MODIFIERS
    // ============================================

    modifier onlyGuardianOrOwner() {
        if (msg.sender != guardian && msg.sender != owner()) revert NotGuardian();
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor(
        address _goToken,
        address _signer,
        address _treasury,
        address _seasonPool,
        uint256 _feeBps,
        uint256 _affiliateBps
    ) Ownable(msg.sender) EIP712("LudoVault", "1") {
        if (
            _goToken == address(0) ||
            _signer == address(0) ||
            _treasury == address(0) ||
            _seasonPool == address(0)
        ) revert InvalidAddress();
        if (_feeBps > MAX_FEE_BPS) revert InvalidFee();
        if (_affiliateBps > _feeBps) revert InvalidFee();

        goToken = IERC20(_goToken);
        signer = _signer;
        treasury = _treasury;
        seasonPool = _seasonPool;
        feeBps = _feeBps;
        affiliateBps = _affiliateBps;
        guardian = msg.sender;
    }

    // ============================================
    // PAUSE CONTROL
    // ============================================

    function pause() external onlyGuardianOrOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============================================
    // ROOM MANAGEMENT ($GO stakes via transferFrom)
    // ============================================

    /**
     * @notice Create a room and escrow the creator's stake in $GO.
     * @dev Caller must approve this vault for `entryAmount` beforehand.
     * @param affiliate Optional influencer referral (address(0) for none).
     */
    function createRoom(
        bytes32 roomId,
        uint256 entryAmount,
        uint256 maxPlayers,
        address affiliate
    ) external nonReentrant whenNotPaused {
        if (entryAmount == 0) revert InvalidAmount();
        if (maxPlayers < 2 || maxPlayers > 4) revert InvalidAmount();
        if (rooms[roomId].status != RoomStatus.EMPTY) revert InvalidRoomStatus();
        if (affiliate == msg.sender) revert SelfAffiliate();

        Room storage room = rooms[roomId];
        room.creator = msg.sender;
        room.participants.push(msg.sender);
        room.maxPlayers = maxPlayers;
        room.entryAmount = entryAmount;
        room.pot = entryAmount;
        room.createdAt = block.timestamp;
        room.affiliate = affiliate;
        room.status = RoomStatus.WAITING;

        goToken.safeTransferFrom(msg.sender, address(this), entryAmount);

        emit RoomCreated(roomId, msg.sender, entryAmount, maxPlayers, affiliate);
    }

    /**
     * @notice Join a waiting room and escrow the entry stake in $GO.
     * @dev Caller must approve this vault for the room's entryAmount beforehand.
     */
    function joinRoom(bytes32 roomId) external nonReentrant whenNotPaused {
        Room storage room = rooms[roomId];

        if (room.status != RoomStatus.WAITING) revert InvalidRoomStatus();
        if (room.participants.length >= room.maxPlayers) revert RoomFull();

        for (uint256 i = 0; i < room.participants.length; i++) {
            if (room.participants[i] == msg.sender) revert AlreadyJoined();
        }

        room.participants.push(msg.sender);
        room.pot += room.entryAmount;

        if (room.participants.length == room.maxPlayers) {
            room.status = RoomStatus.ACTIVE;
        }

        goToken.safeTransferFrom(msg.sender, address(this), room.entryAmount);

        emit RoomJoined(roomId, msg.sender, room.pot, room.participants.length);
    }

    /// @notice Creator cancels a still-WAITING room; every participant is refunded in $GO.
    function cancelRoom(bytes32 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        if (room.status != RoomStatus.WAITING) revert InvalidRoomStatus();
        if (room.creator != msg.sender) revert NotRoomParticipant();

        uint256 totalRefund = room.pot;
        uint256 refundPerPlayer = room.entryAmount;
        address[] memory toRefund = room.participants;

        room.status = RoomStatus.CANCELLED;
        room.pot = 0;

        for (uint256 i = 0; i < toRefund.length; i++) {
            goToken.safeTransfer(toRefund[i], refundPerPlayer);
        }

        emit RoomCancelled(roomId, msg.sender, totalRefund);
    }

    // ============================================
    // PAYOUT (SERVER-SIGNED) + FEE SPLIT / BURN
    // ============================================

    /**
     * @notice Claim the winner payout for a finished game and execute the fee split.
     * @dev `amount` in the signature MUST equal room.pot (pot-bound enforcement).
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
        if (amount != room.pot) revert AmountExceedsPot();

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
        if (_hashTypedDataV4(structHash).recover(signature) != signer)
            revert InvalidSignature();

        usedNonces[nonceKey] = true;
        room.status = RoomStatus.FINISHED;

        uint256 pot = room.pot;
        room.pot = 0;
        address affiliate = room.affiliate;

        // --- Fee math (exact; every $GO wei is accounted for) ---
        uint256 totalFee = (pot * feeBps) / BPS_DENOMINATOR;
        uint256 payout = pot - totalFee;

        uint256 affiliateCut = 0;
        if (affiliate != address(0) && affiliateBps > 0) {
            affiliateCut = (pot * affiliateBps) / BPS_DENOMINATOR;
            if (affiliateCut > totalFee) affiliateCut = totalFee; // never exceed the fee
        }
        uint256 splitBase = totalFee - affiliateCut;
        uint256 burnAmount = (splitBase * BURN_SHARE) / 100;
        uint256 seasonAmount = (splitBase * SEASON_SHARE) / 100;
        uint256 treasuryAmount = splitBase - burnAmount - seasonAmount; // 20% + rounding dust

        // --- Interactions (state already settled above) ---
        goToken.safeTransfer(winner, payout);
        if (affiliateCut > 0) goToken.safeTransfer(affiliate, affiliateCut);
        if (seasonAmount > 0) goToken.safeTransfer(seasonPool, seasonAmount);
        if (treasuryAmount > 0) goToken.safeTransfer(treasury, treasuryAmount);
        if (burnAmount > 0) {
            totalBurned += burnAmount;
            IGoTokenBurn(address(goToken)).burn(burnAmount); // real supply burn
        }

        emit GameFinished(roomId, winner, payout, totalFee);
        emit FeesDistributed(roomId, burnAmount, seasonAmount, treasuryAmount, affiliateCut);
    }

    /// @notice Emergency refund in $GO for ACTIVE (24h) and WAITING (3min) rooms.
    function emergencyWithdraw(bytes32 roomId) external nonReentrant {
        Room storage room = rooms[roomId];

        bool isWaiting = room.status == RoomStatus.WAITING;
        bool isActive = room.status == RoomStatus.ACTIVE;
        if (!isWaiting && !isActive) revert InvalidRoomStatus();

        bool callerIsParticipant = false;
        for (uint256 i = 0; i < room.participants.length; i++) {
            if (room.participants[i] == msg.sender) {
                callerIsParticipant = true;
                break;
            }
        }
        if (!callerIsParticipant) revert NotRoomParticipant();

        if (isWaiting) {
            if (block.timestamp < room.createdAt + ROOM_TIMEOUT)
                revert EmergencyDelayNotPassed();
        } else {
            if (block.timestamp < room.createdAt + EMERGENCY_DELAY)
                revert EmergencyDelayNotPassed();
        }

        address[] memory participants = room.participants;
        uint256 refundPerPlayer = room.entryAmount;

        room.status = RoomStatus.CANCELLED;
        room.pot = 0;

        for (uint256 i = 0; i < participants.length; i++) {
            goToken.safeTransfer(participants[i], refundPerPlayer);
            emit EmergencyWithdraw(roomId, participants[i], refundPerPlayer);
        }
    }

    // ============================================
    // ADMIN & VIEW FUNCTIONS
    // ============================================

    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidAddress();
        emit SignerUpdated(signer, newSigner);
        signer = newSigner;
    }

    function setFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert InvalidFee();
        if (affiliateBps > newFeeBps) revert InvalidFee();
        emit FeeUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    function setAffiliateBps(uint256 newAffiliateBps) external onlyOwner {
        if (newAffiliateBps > feeBps) revert InvalidFee();
        emit AffiliateBpsUpdated(affiliateBps, newAffiliateBps);
        affiliateBps = newAffiliateBps;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setSeasonPool(address newSeasonPool) external onlyOwner {
        if (newSeasonPool == address(0)) revert InvalidAddress();
        emit SeasonPoolUpdated(seasonPool, newSeasonPool);
        seasonPool = newSeasonPool;
    }

    function setGuardian(address newGuardian) external onlyOwner {
        if (newGuardian == address(0)) revert InvalidAddress();
        emit GuardianUpdated(guardian, newGuardian);
        guardian = newGuardian;
    }

    function getRoom(bytes32 roomId) external view returns (Room memory) {
        return rooms[roomId];
    }

    function getParticipants(bytes32 roomId) external view returns (address[] memory) {
        return rooms[roomId].participants;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
