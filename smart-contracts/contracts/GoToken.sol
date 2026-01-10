// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/**
 * @title GoToken
 * @author GoLudo Team
 * @notice ERC-20 Token for GoLudo Platform (Testnet Version with Faucet)
 * @dev Simple ERC-20 implementation using OpenZeppelin contracts
 * 
 * DEPLOYMENT: Coston2 Testnet (Chain ID: 114)
 * PRODUCTION: Replace with audited token or use existing $GO token address
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract GoToken is ERC20, ERC20Burnable, Ownable2Step {
    
    // ============================================
    // CONSTANTS
    // ============================================
    
    /// @notice Maximum supply (1 billion tokens with 18 decimals)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    /// @notice Faucet drip amount (1000 tokens per claim)
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18;
    
    /// @notice Cooldown between faucet claims (1 hour)
    uint256 public constant FAUCET_COOLDOWN = 1 hours;
    
    // ============================================
    // STATE
    // ============================================
    
    /// @notice Tracks last faucet claim time per address
    mapping(address => uint256) public lastFaucetClaim;
    
    /// @notice Faucet enabled/disabled
    bool public faucetEnabled = true;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event FaucetClaim(address indexed user, uint256 amount);
    event FaucetToggled(bool enabled);
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @notice Deploy GoToken with initial supply to deployer
     * @param initialSupply Initial tokens to mint to deployer (in wei)
     */
    constructor(uint256 initialSupply) 
        ERC20("GoLudo Token", "GO") 
        Ownable(msg.sender) 
    {
        require(initialSupply <= MAX_SUPPLY, "Exceeds max supply");
        _mint(msg.sender, initialSupply);
    }
    
    // ============================================
    // FAUCET (TESTNET ONLY)
    // ============================================
    
    /**
     * @notice Claim free tokens from faucet (testnet only)
     * @dev Has cooldown to prevent abuse
     */
    function faucet() external {
        require(faucetEnabled, "Faucet disabled");
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Cooldown active"
        );
        require(
            totalSupply() + FAUCET_AMOUNT <= MAX_SUPPLY,
            "Max supply reached"
        );
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetClaim(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @notice Check remaining cooldown for an address
     * @param user Address to check
     * @return Seconds until next claim (0 if ready)
     */
    function faucetCooldownRemaining(address user) external view returns (uint256) {
        uint256 nextClaim = lastFaucetClaim[user] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextClaim) {
            return 0;
        }
        return nextClaim - block.timestamp;
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Toggle faucet on/off
     * @dev Only callable by owner
     */
    function toggleFaucet() external onlyOwner {
        faucetEnabled = !faucetEnabled;
        emit FaucetToggled(faucetEnabled);
    }
    
    /**
     * @notice Mint tokens (owner only, for initial distribution)
     * @param to Recipient address
     * @param amount Amount to mint (in wei)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
}
