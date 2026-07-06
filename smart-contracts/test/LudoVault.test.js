const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * LudoVault — $GO ERC-20 edition test suite.
 *
 * Covers:
 *  - $GO stake escrow via transferFrom (create/join)
 *  - Solvency invariant: payout + burn + season + treasury + affiliate == pot (2/3/4 players)
 *  - Fee split: 50% burn (real supply shrink) / 30% season pool / 20% treasury
 *  - Affiliate path: 1% of pot to influencer, remainder split
 *  - Pot-bound enforcement (amount != pot rejected)
 *  - Pausable + guardian, WAITING/ACTIVE emergency refunds in $GO
 */
describe("LudoVault ($GO edition)", function () {
    let goToken, ludoVault;
    let owner, player1, player2, player3, player4, serverSigner, treasury, guardian, seasonPool, affiliate;

    const ENTRY_AMOUNT = ethers.parseEther("100");
    const FEE_BPS = 500;        // 5%
    const AFFILIATE_BPS = 100;  // 1% of pot
    const ROOM_TIMEOUT = 3 * 60;
    const EMERGENCY_DELAY = 24 * 60 * 60;
    const ZERO = ethers.ZeroAddress;

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
                { name: "roomId", type: "bytes32" },
                { name: "winner", type: "address" },
                { name: "amount", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" }
            ]
        };
        const nonce = BigInt(ethers.hexlify(ethers.randomBytes(32)));
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const value = { roomId, winner: winnerAddress, amount, nonce, deadline };
        const signature = await signerWallet.signTypedData(domain, types, value);
        return { nonce, deadline, signature };
    }

    // Expected fee split for a given pot (mirrors the contract math).
    function expectedSplit(pot, withAffiliate) {
        const totalFee = (pot * BigInt(FEE_BPS)) / 10000n;
        const payout = pot - totalFee;
        const affiliateCut = withAffiliate ? (pot * BigInt(AFFILIATE_BPS)) / 10000n : 0n;
        const splitBase = totalFee - affiliateCut;
        const burn = (splitBase * 50n) / 100n;
        const season = (splitBase * 30n) / 100n;
        const treasuryAmt = splitBase - burn - season;
        return { totalFee, payout, affiliateCut, burn, season, treasuryAmt };
    }

    async function runSolvencyTest(numPlayers, withAffiliate) {
        const players = [player1, player2, player3, player4].slice(0, numPlayers);
        const roomId = ethers.id(`solvency_${numPlayers}_${withAffiliate}_${Date.now()}`);
        const aff = withAffiliate ? affiliate.address : ZERO;

        await ludoVault.connect(players[0]).createRoom(roomId, ENTRY_AMOUNT, numPlayers, aff);
        for (let i = 1; i < numPlayers; i++) {
            await ludoVault.connect(players[i]).joinRoom(roomId);
        }

        const pot = (await ludoVault.getRoom(roomId)).pot;
        expect(pot).to.equal(ENTRY_AMOUNT * BigInt(numPlayers));

        const exp = expectedSplit(pot, withAffiliate);

        const winnerBefore = await goToken.balanceOf(players[0].address);
        const treasuryBefore = await goToken.balanceOf(treasury.address);
        const seasonBefore = await goToken.balanceOf(seasonPool.address);
        const affBefore = await goToken.balanceOf(affiliate.address);
        const supplyBefore = await goToken.totalSupply();

        const { nonce, deadline, signature } = await buildPayoutSignature(
            serverSigner, roomId, players[0].address, pot
        );
        await ludoVault.connect(players[0]).claimPayout(roomId, players[0].address, pot, nonce, deadline, signature);

        const winnerDelta = (await goToken.balanceOf(players[0].address)) - winnerBefore;
        const treasuryDelta = (await goToken.balanceOf(treasury.address)) - treasuryBefore;
        const seasonDelta = (await goToken.balanceOf(seasonPool.address)) - seasonBefore;
        const affDelta = (await goToken.balanceOf(affiliate.address)) - affBefore;
        const burned = supplyBefore - (await goToken.totalSupply());

        // Fee split matches the contract math exactly.
        expect(winnerDelta).to.equal(exp.payout, "payout wrong");
        expect(treasuryDelta).to.equal(exp.treasuryAmt, "treasury share wrong");
        expect(seasonDelta).to.equal(exp.season, "season share wrong");
        expect(affDelta).to.equal(exp.affiliateCut, "affiliate share wrong");
        expect(burned).to.equal(exp.burn, "burn (supply shrink) wrong");

        // SOLVENCY: every wei of the pot is accounted for.
        expect(winnerDelta + treasuryDelta + seasonDelta + affDelta + burned).to.equal(pot,
            `Solvency broken for ${numPlayers}p affiliate=${withAffiliate}`);
    }

    beforeEach(async function () {
        [owner, player1, player2, player3, player4, serverSigner, treasury, guardian, seasonPool, affiliate] =
            await ethers.getSigners();

        const GoTokenFactory = await ethers.getContractFactory("GoToken");
        goToken = await GoTokenFactory.deploy(ethers.parseEther("1000000")); // 1M faucet reservoir
        await goToken.waitForDeployment();

        const LudoVaultFactory = await ethers.getContractFactory("LudoVault");
        ludoVault = await LudoVaultFactory.deploy(
            await goToken.getAddress(),
            serverSigner.address,
            treasury.address,
            seasonPool.address,
            FEE_BPS,
            AFFILIATE_BPS
        );
        await ludoVault.waitForDeployment();

        // Fund players and approve the vault.
        const vaultAddr = await ludoVault.getAddress();
        for (const p of [player1, player2, player3, player4]) {
            await goToken.transfer(p.address, ethers.parseEther("100000"));
            await goToken.connect(p).approve(vaultAddr, ethers.MaxUint256);
        }
    });

    describe("Room Management ($GO escrow)", function () {
        it("createRoom pulls the stake in $GO", async function () {
            const roomId = ethers.id("room_001");
            const vaultAddr = await ludoVault.getAddress();
            const vaultBefore = await goToken.balanceOf(vaultAddr);

            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, ZERO);

            const room = await ludoVault.getRoom(roomId);
            expect(room.creator).to.equal(player1.address);
            expect(room.pot).to.equal(ENTRY_AMOUNT);
            expect(room.status).to.equal(1); // WAITING
            expect((await goToken.balanceOf(vaultAddr)) - vaultBefore).to.equal(ENTRY_AMOUNT);
        });

        it("joinRoom escrows the second stake and activates the room", async function () {
            const roomId = ethers.id("room_002");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, ZERO);
            await ludoVault.connect(player2).joinRoom(roomId);

            const room = await ludoVault.getRoom(roomId);
            expect(room.participants[1]).to.equal(player2.address);
            expect(room.pot).to.equal(ENTRY_AMOUNT * 2n);
            expect(room.status).to.equal(2); // ACTIVE
        });

        it("rejects a self-affiliate", async function () {
            const roomId = ethers.id("room_self_aff");
            await expect(
                ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, player1.address)
            ).to.be.revertedWithCustomError(ludoVault, "SelfAffiliate");
        });
    });

    describe("Fee split, burn & solvency", function () {
        it("2 players, no affiliate: 50/30/20 split + real burn", async function () {
            await runSolvencyTest(2, false);
        });
        it("3 players, no affiliate", async function () {
            await runSolvencyTest(3, false);
        });
        it("4 players, no affiliate", async function () {
            await runSolvencyTest(4, false);
        });
        it("2 players, WITH affiliate: 1% to influencer, remainder split", async function () {
            await runSolvencyTest(2, true);
        });
        it("4 players, WITH affiliate", async function () {
            await runSolvencyTest(4, true);
        });
        it("tracks cumulative totalBurned on the vault", async function () {
            await runSolvencyTest(2, false);
            const pot = ENTRY_AMOUNT * 2n;
            const { burn } = expectedSplit(pot, false);
            expect(await ludoVault.totalBurned()).to.equal(burn);
        });
    });

    describe("EIP-712 pot-bound enforcement", function () {
        it("rejects amount greater than pot", async function () {
            const roomId = ethers.id("room_over");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, ZERO);
            await ludoVault.connect(player2).joinRoom(roomId);
            const pot = (await ludoVault.getRoom(roomId)).pot;
            const bad = pot + ethers.parseEther("1");
            const { nonce, deadline, signature } = await buildPayoutSignature(serverSigner, roomId, player1.address, bad);
            await expect(
                ludoVault.connect(player1).claimPayout(roomId, player1.address, bad, nonce, deadline, signature)
            ).to.be.revertedWithCustomError(ludoVault, "AmountExceedsPot");
        });

        it("rejects a signature from a non-signer", async function () {
            const roomId = ethers.id("room_badsig");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, ZERO);
            await ludoVault.connect(player2).joinRoom(roomId);
            const pot = (await ludoVault.getRoom(roomId)).pot;
            const { nonce, deadline, signature } = await buildPayoutSignature(player3, roomId, player1.address, pot);
            await expect(
                ludoVault.connect(player1).claimPayout(roomId, player1.address, pot, nonce, deadline, signature)
            ).to.be.revertedWithCustomError(ludoVault, "InvalidSignature");
        });
    });

    describe("Pausable & guardian", function () {
        it("owner pauses; createRoom blocked; owner unpauses", async function () {
            await ludoVault.connect(owner).pause();
            const roomId = ethers.id("room_paused");
            await expect(
                ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, ZERO)
            ).to.be.revertedWithCustomError(ludoVault, "EnforcedPause");
            await ludoVault.connect(owner).unpause();
            expect(await ludoVault.paused()).to.equal(false);
        });

        it("guardian can pause but not unpause", async function () {
            await ludoVault.connect(owner).setGuardian(guardian.address);
            await ludoVault.connect(guardian).pause();
            await expect(
                ludoVault.connect(guardian).unpause()
            ).to.be.revertedWithCustomError(ludoVault, "OwnableUnauthorizedAccount");
            await ludoVault.connect(owner).unpause();
        });

        it("non-guardian cannot pause", async function () {
            await expect(
                ludoVault.connect(player1).pause()
            ).to.be.revertedWithCustomError(ludoVault, "NotGuardian");
        });
    });

    describe("Emergency refunds in $GO", function () {
        it("WAITING room: full refund after ROOM_TIMEOUT", async function () {
            const roomId = ethers.id("room_wait_refund");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, ZERO);
            await time.increase(ROOM_TIMEOUT + 1);
            const before = await goToken.balanceOf(player1.address);
            await ludoVault.connect(player1).emergencyWithdraw(roomId);
            expect((await goToken.balanceOf(player1.address)) - before).to.equal(ENTRY_AMOUNT);
            expect((await ludoVault.getRoom(roomId)).status).to.equal(4); // CANCELLED
        });

        it("WAITING room: refund blocked before ROOM_TIMEOUT", async function () {
            const roomId = ethers.id("room_wait_early");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, ZERO);
            await time.increase(60);
            await expect(
                ludoVault.connect(player1).emergencyWithdraw(roomId)
            ).to.be.revertedWithCustomError(ludoVault, "EmergencyDelayNotPassed");
        });

        it("ACTIVE room: both players refunded after EMERGENCY_DELAY", async function () {
            const roomId = ethers.id("room_active_refund");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, ZERO);
            await ludoVault.connect(player2).joinRoom(roomId);
            await time.increase(EMERGENCY_DELAY + 1);
            const p1Before = await goToken.balanceOf(player1.address);
            const p2Before = await goToken.balanceOf(player2.address);
            await ludoVault.connect(player1).emergencyWithdraw(roomId);
            expect((await goToken.balanceOf(player1.address)) - p1Before).to.equal(ENTRY_AMOUNT);
            expect((await goToken.balanceOf(player2.address)) - p2Before).to.equal(ENTRY_AMOUNT);
        });

        it("cancelRoom refunds a WAITING creator in $GO", async function () {
            const roomId = ethers.id("room_cancel");
            await ludoVault.connect(player1).createRoom(roomId, ENTRY_AMOUNT, 2, ZERO);
            const before = await goToken.balanceOf(player1.address);
            await ludoVault.connect(player1).cancelRoom(roomId);
            expect((await goToken.balanceOf(player1.address)) - before).to.equal(ENTRY_AMOUNT);
            expect((await ludoVault.getRoom(roomId)).status).to.equal(4); // CANCELLED
        });
    });
});
