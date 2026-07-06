const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * GoToken — fixed-supply, deflationary invariants.
 */
describe("GoToken (fixed supply)", function () {
    let goToken, owner, user;
    const MAX = ethers.parseEther("1000000000");
    const RESERVOIR = ethers.parseEther("1000000");
    const DRIP = ethers.parseEther("1000");

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();
        const F = await ethers.getContractFactory("GoToken");
        goToken = await F.deploy(RESERVOIR);
        await goToken.waitForDeployment();
    });

    it("mints exactly MAX_SUPPLY once, split between reservoir and owner", async function () {
        expect(await goToken.totalSupply()).to.equal(MAX);
        expect(await goToken.balanceOf(await goToken.getAddress())).to.equal(RESERVOIR);
        expect(await goToken.balanceOf(owner.address)).to.equal(MAX - RESERVOIR);
    });

    it("exposes no mint() hook (supply is fixed post-deploy)", async function () {
        expect(goToken.mint).to.equal(undefined);
    });

    it("faucet transfers from the reservoir WITHOUT minting (supply unchanged)", async function () {
        const supplyBefore = await goToken.totalSupply();
        await goToken.connect(user).faucet();
        expect(await goToken.balanceOf(user.address)).to.equal(DRIP);
        expect(await goToken.totalSupply()).to.equal(supplyBefore);
        expect(await goToken.faucetReservoir()).to.equal(RESERVOIR - DRIP);
    });

    it("enforces the faucet cooldown", async function () {
        await goToken.connect(user).faucet();
        await expect(goToken.connect(user).faucet()).to.be.revertedWith("Cooldown active");
    });

    it("burn permanently shrinks total supply (deflation)", async function () {
        const before = await goToken.totalSupply();
        const amt = ethers.parseEther("500");
        await goToken.connect(owner).burn(amt);
        expect(await goToken.totalSupply()).to.equal(before - amt);
    });
});
