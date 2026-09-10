const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const rawStablecoin = process.env.DIVIDEND_STABLECOIN;
  if (!rawStablecoin) throw new Error("DIVIDEND_STABLECOIN is required.");
  const stablecoin = hre.ethers.getAddress(rawStablecoin.trim().toLowerCase());

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Dividend stablecoin: ${stablecoin}`);

  const Token = await hre.ethers.getContractFactory("StarlinkRwaToken");
  const token = await Token.deploy(stablecoin);
  await token.waitForDeployment();
  const address = await token.getAddress();
  const network = await hre.ethers.provider.getNetwork();
  const artifact = await hre.artifacts.readArtifact("StarlinkRwaToken");

  const deployment = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    contractAddress: address,
    stablecoinAddress: stablecoin,
    owner: await token.owner(),
    totalSupply: (await token.totalSupply()).toString(),
    abi: artifact.abi,
  };

  const outputPath = path.join(__dirname, "..", "frontend", "deployment.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(`StarlinkRwaToken deployed at: ${address}`);
  console.log(`Deployment metadata written to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
