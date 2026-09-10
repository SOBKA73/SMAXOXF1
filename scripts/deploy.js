const hre = require("hardhat");

async function main() {
  const stablecoin = process.env.DIVIDEND_STABLECOIN;
  if (!stablecoin) {
    throw new Error(
      "DIVIDEND_STABLECOIN is required (use the official chain-specific stablecoin address)."
    );
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Dividend stablecoin: ${stablecoin}`);

  const Token = await hre.ethers.getContractFactory("StarlinkRwaToken");
  const token = await Token.deploy(stablecoin);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log(`StarlinkRwaToken deployed at: ${address}`);
  console.log(`Owner: ${await token.owner()}`);
  console.log(`Total supply: ${await token.totalSupply()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
