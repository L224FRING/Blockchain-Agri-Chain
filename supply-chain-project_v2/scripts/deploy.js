const { ethers } = require("hardhat"); // Import ethers from Hardhat

async function main() {
  console.log("Fetching the deployer wallet...");
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Deploy RoleManager first
  console.log("Deploying RoleManager contract...");
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = await RoleManager.deploy();
  await roleManager.waitForDeployment();
  const roleManagerAddress = await roleManager.getAddress();
  console.log("✅ RoleManager deployed to:", roleManagerAddress);

  // Deploy SupplyChain
  console.log("\nDeploying SupplyChain contract...");
  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const supplyChain = await SupplyChain.deploy(roleManagerAddress);
  await supplyChain.waitForDeployment();
  const supplyChainAddress = await supplyChain.getAddress();
  console.log("✅ SupplyChain deployed to:", supplyChainAddress);

  // Log both addresses for easy config update
  console.log("\n📝 Contract Addresses Summary:");
  console.log("RoleManager:", roleManagerAddress);
  console.log("SupplyChain:", supplyChainAddress);
}

// Standard pattern for running the main function
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
