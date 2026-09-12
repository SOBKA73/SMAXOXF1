const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StarlinkRwaToken", function () {
  async function fixture() {
    const [owner, investorA, investorB, outsider, guardian] = await ethers.getSigners();
    const Stable = await ethers.getContractFactory("MockStablecoin");
    const stable = await Stable.deploy();
    const Token = await ethers.getContractFactory("StarlinkRwaToken");
    const token = await Token.deploy(await stable.getAddress());
    return { owner, investorA, investorB, outsider, guardian, stable, token };
  }

  it("mints exactly 20,000 whole tokens with zero decimals", async function () {
    const { owner, token } = await fixture();
    expect(await token.decimals()).to.equal(0);
    expect(await token.totalSupply()).to.equal(20_000);
    expect(await token.balanceOf(owner.address)).to.equal(20_000);
  });

  it("blocks non-whitelisted recipients and permits approved transfers", async function () {
    const { owner, investorA, outsider, token } = await fixture();
    await expect(token.transfer(outsider.address, 1)).to.be.revertedWithCustomError(token, "NotWhitelisted");
    await token.setWhitelist(investorA.address, true);
    await token.transfer(investorA.address, 5_000);
    expect(await token.balanceOf(investorA.address)).to.equal(5_000);
  });

  it("accepts an owner EIP-712 whitelist signature submitted by the investor", async function () {
    const { owner, investorA, token } = await fixture();
    const network = await ethers.provider.getNetwork();
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
    const nonce = await token.whitelistNonces(investorA.address);
    const domain = { name: "SMAXO Starlink Chad", version: "1", chainId: network.chainId, verifyingContract: await token.getAddress() };
    const types = { Whitelist: [
      { name: "account", type: "address" },
      { name: "approved", type: "bool" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ] };
    const signature = await owner.signTypedData(domain, types, { account: investorA.address, approved: true, nonce, deadline });
    const split = ethers.Signature.from(signature);
    await token.connect(investorA).whitelistWithSig(investorA.address, true, deadline, split.v, split.r, split.s);
    expect(await token.isWhitelisted(investorA.address)).to.equal(true);
    expect(await token.whitelistNonces(investorA.address)).to.equal(1);
  });

  it("rejects an expired or non-owner whitelist signature", async function () {
    const { outsider, investorA, token } = await fixture();
    const network = await ethers.provider.getNetwork();
    const deadline = (await ethers.provider.getBlock("latest")).timestamp - 1;
    const domain = { name: "SMAXO Starlink Chad", version: "1", chainId: network.chainId, verifyingContract: await token.getAddress() };
    const types = { Whitelist: [
      { name: "account", type: "address" }, { name: "approved", type: "bool" },
      { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
    ] };
    const signature = await outsider.signTypedData(domain, types, { account: investorA.address, approved: true, nonce: 0, deadline });
    const split = ethers.Signature.from(signature);
    await expect(token.whitelistWithSig(investorA.address, true, deadline, split.v, split.r, split.s)).to.be.revertedWithCustomError(token, "SignatureExpired");
  });

  it("allocates native dividends pro rata and supports pull claims", async function () {
    const { investorA, investorB, token } = await fixture();
    await token.setWhitelist(investorA.address, true);
    await token.setWhitelist(investorB.address, true);
    await token.transfer(investorA.address, 5_000);
    await token.transfer(investorB.address, 5_000);
    await token.distributeDividends({ value: ethers.parseEther("1") });
    expect(await token.nativeDividendsOwed(investorA.address)).to.equal(ethers.parseEther("0.25"));
    expect(await token.nativeDividendsOwed(investorB.address)).to.equal(ethers.parseEther("0.25"));
    await expect(token.connect(investorA).claimNativeDividends()).to.emit(token, "NativeDividendsClaimed").withArgs(investorA.address, ethers.parseEther("0.25"));
  });

  it("allocates stablecoin dividends with SafeERC20", async function () {
    const { investorA, investorB, stable, token } = await fixture();
    await token.setWhitelist(investorA.address, true);
    await token.setWhitelist(investorB.address, true);
    await token.transfer(investorA.address, 5_000);
    await token.transfer(investorB.address, 5_000);
    const amount = ethers.parseUnits("1000", 18);
    await stable.approve(await token.getAddress(), amount);
    await token.distributeStablecoin(amount);
    expect(await token.stableDividendsOwed(investorA.address)).to.equal(ethers.parseUnits("250", 18));
    expect(await token.stableDividendsOwed(investorB.address)).to.equal(ethers.parseUnits("250", 18));
  });

  it("restricts pause controls to the owner and blocks normal transfers while paused", async function () {
    const { owner, investorA, token } = await fixture();
    await token.setWhitelist(investorA.address, true);
    await token.pause();
    expect(await token.paused()).to.equal(true);
    await expect(token.connect(investorA).transfer(owner.address, 1)).to.be.revertedWithCustomError(token, "EnforcedPause");
    await expect(token.connect(investorA).pause()).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    await token.unpause();
    expect(await token.paused()).to.equal(false);
  });

  it("requires a distinct guardian confirmation for emergency recovery", async function () {
    const { owner, investorA, investorB, guardian, token } = await fixture();
    await token.setGuardian(guardian.address);
    await token.setWhitelist(investorA.address, true);
    await token.setWhitelist(investorB.address, true);
    await token.transfer(investorA.address, 1_000);
    await token.pause();
    const proposalTx = await token.proposeEmergencyRecovery(investorA.address, investorB.address);
    const receipt = await proposalTx.wait();
    const proposedAt = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
    await expect(token.emergencyRecoverTokens(investorA.address, investorB.address, proposedAt)).to.be.revertedWithCustomError(token, "RecoveryNotConfirmed");
    await token.connect(guardian).confirmEmergencyRecovery(investorA.address, investorB.address, proposedAt);
    await expect(token.emergencyRecoverTokens(investorA.address, investorB.address, proposedAt)).to.emit(token, "EmergencyTokensRecovered").withArgs(investorA.address, investorB.address, 1_000);
    expect(await token.balanceOf(investorA.address)).to.equal(0);
    expect(await token.balanceOf(investorB.address)).to.equal(1_000);
  });
});
