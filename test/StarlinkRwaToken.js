const { expect } = require("chai");
const { ethers } = require("hardhat");

 describe("StarlinkRwaToken", function () {
  async function fixture() {
    const [owner, investorA, investorB, outsider] = await ethers.getSigners();
    const Stable = await ethers.getContractFactory("MockStablecoin");
    const stable = await Stable.deploy();
    const Token = await ethers.getContractFactory("StarlinkRwaToken");
    const token = await Token.deploy(await stable.getAddress());
    return { owner, investorA, investorB, outsider, stable, token };
  }

  it("mints exactly 20,000 whole tokens with zero decimals", async function () {
    const { owner, token } = await fixture();
    expect(await token.decimals()).to.equal(0);
    expect(await token.totalSupply()).to.equal(20_000);
    expect(await token.balanceOf(owner.address)).to.equal(20_000);
  });

  it("blocks non-whitelisted recipients and permits approved transfers", async function () {
    const { owner, investorA, outsider, token } = await fixture();
    await expect(token.transfer(outsider.address, 1)).to.be.revertedWithCustomError(
      token,
      "NotWhitelisted"
    );
    await token.setWhitelist(investorA.address, true);
    await token.transfer(investorA.address, 5_000);
    expect(await token.balanceOf(investorA.address)).to.equal(5_000);
  });

  it("allocates native dividends pro rata and supports pull claims", async function () {
    const { owner, investorA, investorB, token } = await fixture();
    await token.setWhitelist(investorA.address, true);
    await token.setWhitelist(investorB.address, true);
    await token.transfer(investorA.address, 5_000);
    await token.transfer(investorB.address, 5_000);

    await token.distributeDividends({ value: ethers.parseEther("1") });
    expect(await token.nativeDividendsOwed(investorA.address)).to.equal(
      ethers.parseEther("0.25")
    );
    expect(await token.nativeDividendsOwed(investorB.address)).to.equal(
      ethers.parseEther("0.25")
    );
    await expect(token.connect(investorA).claimNativeDividends())
      .to.emit(token, "NativeDividendsClaimed")
      .withArgs(investorA.address, ethers.parseEther("0.25"));
  });

  it("allocates stablecoin dividends pro rata", async function () {
    const { owner, investorA, investorB, stable, token } = await fixture();
    await token.setWhitelist(investorA.address, true);
    await token.setWhitelist(investorB.address, true);
    await token.transfer(investorA.address, 5_000);
    await token.transfer(investorB.address, 5_000);

    const amount = ethers.parseUnits("1000", 18);
    await stable.approve(await token.getAddress(), amount);
    await token.distributeStablecoin(amount);
    expect(await token.stableDividendsOwed(investorA.address)).to.equal(
      ethers.parseUnits("250", 18)
    );
    expect(await token.stableDividendsOwed(investorB.address)).to.equal(
      ethers.parseUnits("250", 18)
    );
  });
});
