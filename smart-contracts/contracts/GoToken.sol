// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/**
 * @title GoToken
 * @author GoLudo Team
 * @notice ERC-20 utility token ($GO) for the GoLudo platform.
 * @dev Strictly fixed-supply, deflationary-by-burn design.
 *
 * DEPLOYMENT: Coston2 Testnet (Chain ID: 114)
 *
 * TOKENOMICS INVARIANTS (enforced by this contract):
 *  - Total supply is minted ONCE in the constructor and hardcapped at 1,000,000,000 $GO.
 *  - There is NO post-deployment minting hook. `mint()` was removed on purpose:
 *    supply can only ever shrink (via ERC20Burnable.burn from the vault fee split),
 *    never grow. This is what makes the "strictly deflationary" claim literally true.
 *  - The testnet faucet TRANSFERS from a pre-funded reservoir held by this contract;
 *    it does not mint. When the reservoir is empty the faucet stops until refilled
 *    from an existing balance (still no new tokens created).
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract GoToken is ERC20, ERC20Burnable, Ownable2Step {
    // ============================================
    // CONSTANTS
    // ============================================

    /// @notice Fixed hardcap: 1 billion $GO (18 decimals). Enforced at mint time; never exceeded.
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    /// @notice Faucet drip amount per claim (testnet).
    uint256 public constant FAUCET_AMOUNT = 1000 * 10 ** 18;

    /// @notice Cooldown between faucet claims.
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    // ============================================
    // STATE
    // ============================================

    mapping(address => uint256) public lastFaucetClaim;
    bool public faucetEnabled = true;

    // ============================================
    // EVENTS
    // ============================================

    event FaucetClaim(address indexed user, uint256 amount);
    event FaucetToggled(bool enabled);
    event FaucetRefilled(address indexed from, uint256 amount);

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Mints the entire fixed supply once and splits it between a faucet
     *         reservoir (held by this contract) and the deployer (for distribution
     *         into the allocation vaults per the tokenomics blueprint).
     * @param faucetReservoirAmount Amount of $GO parked inside this contract for the testnet faucet.
     * @dev After this constructor runs, no function can create new tokens.
     */
    constructor(uint256 faucetReservoirAmount)
        ERC20("GoLudo Token", "GO")
        Ownable(msg.sender)
    {
        require(faucetReservoirAmount <= MAX_SUPPLY, "Reservoir exceeds supply");
        if (faucetReservoirAmount > 0) {
            _mint(address(this), faucetReservoirAmount);
        }
        _mint(msg.sender, MAX_SUPPLY - faucetReservoirAmount);
        // Post-condition: totalSupply() == MAX_SUPPLY, and no mint path remains.
    }

    // ============================================
    // FAUCET (TESTNET ONLY) — transfers, never mints
    // ============================================

    /// @notice Claim free testnet $GO from the pre-funded reservoir.
    function faucet() external {
        require(faucetEnabled, "Faucet disabled");
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Cooldown active"
        );
        require(
            balanceOf(address(this)) >= FAUCET_AMOUNT,
            "Faucet reservoir empty"
        );

        lastFaucetClaim[msg.sender] = block.timestamp;
        _transfer(address(this), msg.sender, FAUCET_AMOUNT);

        emit FaucetClaim(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Seconds until `user` can claim again (0 if ready).
    function faucetCooldownRemaining(address user) external view returns (uint256) {
        uint256 nextClaim = lastFaucetClaim[user] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextClaim) return 0;
        return nextClaim - block.timestamp;
    }

    /// @notice Current faucet reservoir balance.
    function faucetReservoir() external view returns (uint256) {
        return balanceOf(address(this));
    }

    // ============================================
    // ADMIN — moves existing tokens only, never mints
    // ============================================

    /// @notice Top up the faucet reservoir from the owner's existing balance.
    function refillFaucet(uint256 amount) external onlyOwner {
        _transfer(msg.sender, address(this), amount);
        emit FaucetRefilled(msg.sender, amount);
    }

    /// @notice Toggle the faucet on/off.
    function toggleFaucet() external onlyOwner {
        faucetEnabled = !faucetEnabled;
        emit FaucetToggled(faucetEnabled);
    }

    // NOTE: no mint() function exists — the supply is fixed at deployment by design.
}
