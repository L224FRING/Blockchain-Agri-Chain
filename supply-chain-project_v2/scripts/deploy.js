const { ethers } = require("hardhat"); // Import ethers from Hardhat

async function main() {
  console.log("Fetching the deployer wallet...");
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);
  
  console.log("Deploying contract...");

  // Get the contract factory
  const SupplyChain = await ethers.getContractFactory("SupplyChain");

  // Start the deployment
  const supplyChain = await SupplyChain.deploy();

  // Wait for the deployment to be confirmed
  await supplyChain.waitForDeployment();

  // Get the contract address
  const contractAddress = await supplyChain.getAddress();

  console.log("✅ Contract deployed to:", contractAddress);
}

// Standard pattern for running the main function
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});