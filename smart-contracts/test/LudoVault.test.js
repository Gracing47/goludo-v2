const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * LudoVault EIP-712 Signature Flow Test (JS Version)
 */
describe("LudoVault", function () {
    let goToken;
    let ludoVault;
    let owner;
    let player1;
    let player2;
    let serverSigner;
    let treasury;

    const ENTRY_AMOUNT = ethers.parseEther("100");
    const FEE_BPS = 250; // 2.5%

    beforeEach(async function () {
        [owner, player1, player2, serverSigner, treasury] = await ethers.getSigners();

        // Deploy GoToken (LudoVault now Uses Native FLR, but we might need GoToken for other tests or future migration)
        const GoTokenFactory = await ethers.getContractFactory("GoToken");
        goToken = await GoTokenFactory.deploy(ethers.parseEther("1000000"));
        await goToken.waitForDeployment();

        // Deploy LudoVault (Uses Native Currency)
        const LudoVaultFactory = await ethers.getContractFactory("LudoVault");
        ludoVault = await LudoVaultFactory.deploy(
            serverSigner.address,
            treasury.address,
            FEE_BPS
        );
        await ludoVault.waitForDeployment();

        // No need for GoToken transfers/approvals if using Native FLR
    });

    describe("Room Management", function () {
        it("should create a room with deposit", async function () {
            const roomId = ethers.id("room_001");
            const maxPlayers = 2;

            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, maxPlayers, { value: ENTRY_AMOUNT });

            const room = await ludoVault.getRoom(roomId);
            expect(room.creator).to.equal(player1.address);
            expect(room.entryAmount).to.equal(ENTRY_AMOUNT);
            expect(room.pot).to.equal(ENTRY_AMOUNT);
            expect(room.status).to.equal(1); // WAITING
        });

        it("should allow opponent to join room", async function () {
            const roomId = ethers.id("room_002");
            const maxPlayers = 2;

            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, maxPlayers, { value: ENTRY_AMOUNT });
            await ludoVault.connect(player2).joinRoom(roomId, { value: ENTRY_AMOUNT });

            const room = await ludoVault.getRoom(roomId);
            expect(room.participants[1]).to.equal(player2.address);
            expect(room.pot).to.equal(ENTRY_AMOUNT * 2n);
            expect(room.status).to.equal(2); // ACTIVE
        });
    });

    describe("EIP-712 Signature Payout", function () {
        it("should accept valid server signature for payout", async function () {
            const roomId = ethers.id("room_payout_test");
            const maxPlayers = 2;

            // Setup: Create and join room
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, maxPlayers, { value: ENTRY_AMOUNT });
            await ludoVault.connect(player2).joinRoom(roomId, { value: ENTRY_AMOUNT });

            const room = await ludoVault.getRoom(roomId);
            const totalPot = room.pot;

            // Server generates payout signature
            const nonce = ethers.id("unique_nonce_123");
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            // EIP-712 Domain
            const network = await ethers.provider.getNetwork();
            const domain = {
                name: "LudoVault",
                version: "1",
                chainId: network.chainId,
                verifyingContract: await ludoVault.getAddress()
            };

            // EIP-712 Types
            const types = {
                Payout: [
                    { name: "roomId", type: "bytes32" },
                    { name: "winner", type: "address" },
                    { name: "amount", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" }
                ]
            };

            // Payout data
            const payoutData = {
                roomId: roomId,
                winner: player1.address,
                amount: totalPot,
                nonce: BigInt(nonce),
                deadline: deadline
            };

            // Server signs
            const signature = await serverSigner.signTypedData(domain, types, payoutData);

            // Claim payout
            await ludoVault.connect(player1).claimPayout(
                roomId,
                player1.address,
                totalPot,
                BigInt(nonce),
                deadline,
                signature
            );

            // Room should be finished
            const updatedRoom = await ludoVault.getRoom(roomId);
            expect(updatedRoom.status).to.equal(3); // FINISHED
        });
    });
});
