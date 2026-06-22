const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * LudoVault EIP-712 Signature Flow Test
 *
 * Covers:
 *  - Room creation / joining
 *  - Solvency invariant: fee + payout == pot (2, 3, 4 players)
 *  - Pot-bound enforcement: claimPayout rejects amount != pot
 *  - Pausable: createRoom/joinRoom/claimPayout blocked when paused
 *  - Guardian: non-owner guardian can pause
 *  - WAITING-room emergencyWithdraw (refund after ROOM_TIMEOUT)
 *  - ACTIVE-room emergencyWithdraw (refund after EMERGENCY_DELAY)
 */
describe("LudoVault", function () {
    let goToken;
    let ludoVault;
    let owner;
    let player1;
    let player2;
    let player3;
    let player4;
    let serverSigner;
    let treasury;
    let guardian;

    const ENTRY_AMOUNT = ethers.parseEther("100");
    const FEE_BPS = 250; // 2.5%

    // Timing constants (must match contract)
    const ROOM_TIMEOUT    = 3 * 60;        // 3 minutes in seconds
    const EMERGENCY_DELAY = 24 * 60 * 60;  // 24 hours in seconds

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * Builds and returns an EIP-712 payout signature from `signerWallet`.
     */
    async function buildPayoutSignature(signerWallet, roomId, winnerAddress, amount) {
        const network = await ethers.provider.getNetwork();
        const domain = {
            name: "LudoVault",
            version: "1",
            chainId: network.chainId,
            verifyingContract: await ludoVault.getAddress()
        };
        const types = {
            Payout: [
                { name: "roomId",   type: "bytes32"  },
                { name: "winner",   type: "address"  },
                { name: "amount",   type: "uint256"  },
                { name: "nonce",    type: "uint256"  },
                { name: "deadline", type: "uint256"  }
            ]
        };
        const nonce = BigInt(ethers.hexlify(ethers.randomBytes(32)));
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const value = { roomId, winner: winnerAddress, amount, nonce, deadline };
        const signature = await signerWallet.signTypedData(domain, types, value);
        return { nonce, deadline, signature };
    }

    /**
     * Runs a full n-player game and verifies fee + payout == pot (solvency invariant).
     * Returns { fee, payout, pot }.
     */
    async function runSolvencyTest(numPlayers) {
        const players = [player1, player2, player3, player4].slice(0, numPlayers);
        const roomId = ethers.id(`solvency_room_${numPlayers}_${Date.now()}`);

        // Create room
        await ludoVault.connect(players[0]).createRoom(roomId, ENTRY_AMOUNT, numPlayers, { value: ENTRY_AMOUNT });

        // Join remaining players
        for (let i = 1; i < numPlayers; i++) {
            await ludoVault.connect(players[i]).joinRoom(roomId, { value: ENTRY_AMOUNT });
        }

        const room = await ludoVault.getRoom(roomId);
        const pot  = room.pot;

        // Sanity: pot == entryAmount * numPlayers
        expect(pot).to.equal(ENTRY_AMOUNT * BigInt(numPlayers), "Pot should equal entryAmount * numPlayers");

        // Sign payout for player1 (winner), amount == pot
        const { nonce, deadline, signature } = await buildPayoutSignature(
            serverSigner, roomId, players[0].address, pot
        );

        const treasuryBefore = await ethers.provider.getBalance(treasury.address);
        const winnerBefore   = await ethers.provider.getBalance(players[0].address);

        const tx = await ludoVault.connect(players[0]).claimPayout(
            roomId, players[0].address, pot, nonce, deadline, signature
        );
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed * tx.gasPrice;

        const treasuryAfter = await ethers.provider.getBalance(treasury.address);
        const winnerAfter   = await ethers.provider.getBalance(players[0].address);

        const feeReceived    = treasuryAfter - treasuryBefore;
        const payoutReceived = winnerAfter - winnerBefore + gasUsed; // net of gas

        const expectedFee    = (pot * BigInt(FEE_BPS)) / 10000n;
        const expectedPayout = pot - expectedFee;

        // SOLVENCY INVARIANT: fee + payout == pot
        expect(feeReceived + payoutReceived).to.equal(pot,
            `Solvency broken for ${numPlayers} players: fee(${feeReceived}) + payout(${payoutReceived}) != pot(${pot})`
        );
        expect(feeReceived).to.equal(expectedFee, "Fee does not match feeBps");
        expect(payoutReceived).to.equal(expectedPayout, "Payout does not match pot - fee");

        return { fee: feeReceived, payout: payoutReceived, pot };
    }

    // ---------------------------------------------------------------
    // Before each
    // ---------------------------------------------------------------

    beforeEach(async function () {
        [owner, player1, player2, player3, player4, serverSigner, treasury, guardian] =
            await ethers.getSigners();

        // Deploy GoToken (retained for legacy test compatibility; vault uses native currency)
        const GoTokenFactory = await ethers.getContractFactory("GoToken");
        goToken = await GoTokenFactory.deploy(ethers.parseEther("1000000"));
        await goToken.waitForDeployment();

        // Deploy LudoVault
        const LudoVaultFactory = await ethers.getContractFactory("LudoVault");
        ludoVault = await LudoVaultFactory.deploy(
            serverSigner.address,
            treasury.address,
            FEE_BPS
        );
        await ludoVault.waitForDeployment();
    });

    // ---------------------------------------------------------------
    // Room Management
    // ---------------------------------------------------------------
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

    // ---------------------------------------------------------------
    // EIP-712 Signature Payout
    // ---------------------------------------------------------------
    describe("EIP-712 Signature Payout", function () {
        it("should accept valid server signature for payout", async function () {
            const roomId = ethers.id("room_payout_test");
            const maxPlayers = 2;

            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, maxPlayers, { value: ENTRY_AMOUNT });
            await ludoVault.connect(player2).joinRoom(roomId, { value: ENTRY_AMOUNT });

            const room = await ludoVault.getRoom(roomId);
            const totalPot = room.pot;

            const { nonce, deadline, signature } = await buildPayoutSignature(
                serverSigner, roomId, player1.address, totalPot
            );

            await ludoVault.connect(player1).claimPayout(
                roomId, player1.address, totalPot, nonce, deadline, signature
            );

            const updatedRoom = await ludoVault.getRoom(roomId);
            expect(updatedRoom.status).to.equal(3); // FINISHED
        });

        it("should reject payout when amount exceeds pot (PROD-6 / AAA-C1)", async function () {
            const roomId = ethers.id("room_drain_attempt");
            const maxPlayers = 2;

            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, maxPlayers, { value: ENTRY_AMOUNT });
            await ludoVault.connect(player2).joinRoom(roomId, { value: ENTRY_AMOUNT });

            const room = await ludoVault.getRoom(roomId);
            const overdrawnAmount = room.pot + ethers.parseEther("1"); // 1 extra

            const { nonce, deadline, signature } = await buildPayoutSignature(
                serverSigner, roomId, player1.address, overdrawnAmount
            );

            await expect(
                ludoVault.connect(player1).claimPayout(
                    roomId, player1.address, overdrawnAmount, nonce, deadline, signature
                )
            ).to.be.revertedWithCustomError(ludoVault, "AmountExceedsPot");
        });

        it("should reject payout when amount is less than pot", async function () {
            const roomId = ethers.id("room_underpay_attempt");
            const maxPlayers = 2;

            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, maxPlayers, { value: ENTRY_AMOUNT });
            await ludoVault.connect(player2).joinRoom(roomId, { value: ENTRY_AMOUNT });

            const room = await ludoVault.getRoom(roomId);
            const underdrawnAmount = room.pot - 1n; // 1 wei less

            const { nonce, deadline, signature } = await buildPayoutSignature(
                serverSigner, roomId, player1.address, underdrawnAmount
            );

            await expect(
                ludoVault.connect(player1).claimPayout(
                    roomId, player1.address, underdrawnAmount, nonce, deadline, signature
                )
            ).to.be.revertedWithCustomError(ludoVault, "AmountExceedsPot");
        });
    });

    // ---------------------------------------------------------------
    // Solvency Invariant — fee + payout == pot (2, 3, 4 players)
    // ---------------------------------------------------------------
    describe("Solvency Invariant (fee + payout == pot)", function () {
        it("2 players: fee + payout == pot", async function () {
            const { fee, payout, pot } = await runSolvencyTest(2);
            // Explicit numeric check
            expect(fee + payout).to.equal(pot);
        });

        it("3 players: fee + payout == pot", async function () {
            const { fee, payout, pot } = await runSolvencyTest(3);
            expect(fee + payout).to.equal(pot);
        });

        it("4 players: fee + payout == pot", async function () {
            const { fee, payout, pot } = await runSolvencyTest(4);
            expect(fee + payout).to.equal(pot);
        });
    });

    // ---------------------------------------------------------------
    // Pausable (PROD-6)
    // ---------------------------------------------------------------
    describe("Pausable", function () {
        it("owner can pause and unpause", async function () {
            await ludoVault.connect(owner).pause();
            expect(await ludoVault.paused()).to.equal(true);

            const roomId = ethers.id("room_paused_test");
            await expect(
                ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, { value: ENTRY_AMOUNT })
            ).to.be.revertedWithCustomError(ludoVault, "EnforcedPause");

            await ludoVault.connect(owner).unpause();
            expect(await ludoVault.paused()).to.equal(false);
        });

        it("guardian can pause but NOT unpause", async function () {
            // Assign guardian role
            await ludoVault.connect(owner).setGuardian(guardian.address);

            await ludoVault.connect(guardian).pause();
            expect(await ludoVault.paused()).to.equal(true);

            // Guardian cannot unpause
            await expect(
                ludoVault.connect(guardian).unpause()
            ).to.be.revertedWithCustomError(ludoVault, "OwnableUnauthorizedAccount");

            // Only owner can unpause
            await ludoVault.connect(owner).unpause();
            expect(await ludoVault.paused()).to.equal(false);
        });

        it("non-guardian/non-owner cannot pause", async function () {
            await expect(
                ludoVault.connect(player1).pause()
            ).to.be.revertedWithCustomError(ludoVault, "NotGuardian");
        });

        it("joinRoom is gated by whenNotPaused", async function () {
            const roomId = ethers.id("room_pause_join");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, { value: ENTRY_AMOUNT });

            await ludoVault.connect(owner).pause();

            await expect(
                ludoVault.connect(player2).joinRoom(roomId, { value: ENTRY_AMOUNT })
            ).to.be.revertedWithCustomError(ludoVault, "EnforcedPause");
        });

        it("claimPayout is gated by whenNotPaused", async function () {
            const roomId = ethers.id("room_pause_claim");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, { value: ENTRY_AMOUNT });
            await ludoVault.connect(player2).joinRoom(roomId, { value: ENTRY_AMOUNT });

            const room = await ludoVault.getRoom(roomId);
            const { nonce, deadline, signature } = await buildPayoutSignature(
                serverSigner, roomId, player1.address, room.pot
            );

            await ludoVault.connect(owner).pause();

            await expect(
                ludoVault.connect(player1).claimPayout(roomId, player1.address, room.pot, nonce, deadline, signature)
            ).to.be.revertedWithCustomError(ludoVault, "EnforcedPause");
        });
    });

    // ---------------------------------------------------------------
    // Emergency Withdraw — WAITING room (PROD-6 / new)
    // ---------------------------------------------------------------
    describe("emergencyWithdraw — WAITING room refund", function () {
        it("should refund all participants after ROOM_TIMEOUT when room never filled", async function () {
            const roomId = ethers.id("room_waiting_refund");

            // Only player1 joins; room stays WAITING (maxPlayers = 2)
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, { value: ENTRY_AMOUNT });

            let room = await ludoVault.getRoom(roomId);
            expect(room.status).to.equal(1); // WAITING

            // Fast-forward past ROOM_TIMEOUT
            await time.increase(ROOM_TIMEOUT + 1);

            const player1Before = await ethers.provider.getBalance(player1.address);

            const tx = await ludoVault.connect(player1).emergencyWithdraw(roomId);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * tx.gasPrice;

            const player1After = await ethers.provider.getBalance(player1.address);
            // Net recovery (refund minus gas)
            const netRecovery = player1After - player1Before + gasUsed;
            expect(netRecovery).to.equal(ENTRY_AMOUNT, "Player1 should recover their full entry amount");

            // Room should now be CANCELLED
            room = await ludoVault.getRoom(roomId);
            expect(room.status).to.equal(4); // CANCELLED
            expect(room.pot).to.equal(0n);
        });

        it("should NOT allow emergencyWithdraw before ROOM_TIMEOUT on WAITING room", async function () {
            const roomId = ethers.id("room_waiting_early_refund");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, { value: ENTRY_AMOUNT });

            // Only 1 minute elapsed — before the 3 minute timeout
            await time.increase(60);

            await expect(
                ludoVault.connect(player1).emergencyWithdraw(roomId)
            ).to.be.revertedWithCustomError(ludoVault, "EmergencyDelayNotPassed");
        });

        it("should refund multiple participants in WAITING room (partial fill)", async function () {
            // 3-player room but only 2 join — room stays WAITING
            const roomId = ethers.id("room_partial_waiting_refund");

            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 3, { value: ENTRY_AMOUNT });
            await ludoVault.connect(player2).joinRoom(roomId, { value: ENTRY_AMOUNT });

            let room = await ludoVault.getRoom(roomId);
            expect(room.status).to.equal(1); // WAITING (needs 3rd player)

            await time.increase(ROOM_TIMEOUT + 1);

            const p1Before = await ethers.provider.getBalance(player1.address);
            const p2Before = await ethers.provider.getBalance(player2.address);

            const tx = await ludoVault.connect(player1).emergencyWithdraw(roomId);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * tx.gasPrice;

            const p1After = await ethers.provider.getBalance(player1.address);
            const p2After = await ethers.provider.getBalance(player2.address);

            // player1 paid gas; both should recover ENTRY_AMOUNT
            expect(p1After - p1Before + gasUsed).to.equal(ENTRY_AMOUNT, "Player1 stake not refunded");
            expect(p2After - p2Before).to.equal(ENTRY_AMOUNT, "Player2 stake not refunded");

            room = await ludoVault.getRoom(roomId);
            expect(room.status).to.equal(4); // CANCELLED
            expect(room.pot).to.equal(0n);
        });

        it("non-participant cannot trigger WAITING emergencyWithdraw", async function () {
            const roomId = ethers.id("room_non_participant_withdraw");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, { value: ENTRY_AMOUNT });
            await time.increase(ROOM_TIMEOUT + 1);

            await expect(
                ludoVault.connect(player2).emergencyWithdraw(roomId)
            ).to.be.revertedWithCustomError(ludoVault, "NotRoomParticipant");
        });
    });

    // ---------------------------------------------------------------
    // Emergency Withdraw — ACTIVE room (pre-existing, regression)
    // ---------------------------------------------------------------
    describe("emergencyWithdraw — ACTIVE room (regression)", function () {
        it("should refund all players in ACTIVE room after EMERGENCY_DELAY", async function () {
            const roomId = ethers.id("room_active_refund");

            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, { value: ENTRY_AMOUNT });
            await ludoVault.connect(player2).joinRoom(roomId, { value: ENTRY_AMOUNT });

            let room = await ludoVault.getRoom(roomId);
            expect(room.status).to.equal(2); // ACTIVE

            await time.increase(EMERGENCY_DELAY + 1);

            const p1Before = await ethers.provider.getBalance(player1.address);
            const p2Before = await ethers.provider.getBalance(player2.address);

            const tx = await ludoVault.connect(player1).emergencyWithdraw(roomId);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * tx.gasPrice;

            const p1After = await ethers.provider.getBalance(player1.address);
            const p2After = await ethers.provider.getBalance(player2.address);

            expect(p1After - p1Before + gasUsed).to.equal(ENTRY_AMOUNT, "Player1 stake not refunded");
            expect(p2After - p2Before).to.equal(ENTRY_AMOUNT, "Player2 stake not refunded");

            room = await ludoVault.getRoom(roomId);
            expect(room.status).to.equal(4); // CANCELLED
        });

        it("should NOT allow emergencyWithdraw on ACTIVE room before EMERGENCY_DELAY", async function () {
            const roomId = ethers.id("room_active_early_refund");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, { value: ENTRY_AMOUNT });
            await ludoVault.connect(player2).joinRoom(roomId, { value: ENTRY_AMOUNT });

            await time.increase(ROOM_TIMEOUT + 1); // past 3min but not 24h

            await expect(
                ludoVault.connect(player1).emergencyWithdraw(roomId)
            ).to.be.revertedWithCustomError(ludoVault, "EmergencyDelayNotPassed");
        });
    });
});
