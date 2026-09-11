const hre = require("hardhat");

const CONTRACT_ADDRESS = "0xe52f7A50D7d000D011dE760CBdeB57363A029406";
const REQUESTED_NEW_OWNER = "0x7fc05911b8eE165dA41F60fB90a971af14b6F7C5";
const ABI = [
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)",
];

async function main() {
  const newOwner = hre.ethers.getAddress(REQUESTED_NEW_OWNER.toLowerCase());
  const [deployer] = await hre.ethers.getSigners();
  const contract = new hre.ethers.Contract(CONTRACT_ADDRESS, ABI, deployer);
  const currentOwner = await contract.owner();

  console.log(`Current owner: ${currentOwner}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`New owner: ${newOwner}`);

  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error("The configured deployer is not the current contract owner.");
  }

  const tx = await contract.transferOwnership(newOwner);
  console.log(`Transfer transaction: ${tx.hash}`);
  await tx.wait();

  const verifiedOwner = await contract.owner();
  if (verifiedOwner.toLowerCase() !== newOwner.toLowerCase()) {
    throw new Error(`Ownership verification failed: ${verifiedOwner}`);
  }

  console.log(`Ownership transferred and verified: ${verifiedOwner}`);
  console.log(`Explorer: https://sepolia.arbiscan.io/tx/${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
