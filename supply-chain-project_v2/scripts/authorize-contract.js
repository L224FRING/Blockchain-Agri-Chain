const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * This script authorizes the SupplyChain contract to add ratings in RoleManager.
 * Must be run by the owner of the RoleManager contract.
 * 
 * Usage: npx hardhat run scripts/authorize-contract.js --network sepolia
 */

async function main() {
  console.log("🔐 Authorizing SupplyChain contract...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Running as:", deployer.address);

  // Read addresses from config.js
  const configPath = path.join(__dirname, '../../frontend_v2/src/config.js');
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Extract addresses using regex
  const roleManagerMatch = configContent.match(/ROLE_MANAGER_ADDRESS = "(0x[a-fA-F0-9]{40})"/);
  const supplyChainMatch = configContent.match(/SUPPLY_CHAIN_ADDRESS = "(0x[a-fA-F0-9]{40})"/);

  if (!roleManagerMatch || !supplyChainMatch) {
    console.error("❌ Error: Could not find contract addresses in config.js");
    console.log("Please make sure config.js has been updated with deployed addresses.");
    process.exit(1);
  }

  const roleManagerAddress = roleManagerMatch[1];
  const supplyChainAddress = supplyChainMatch[1];

  console.log("RoleManager address:", roleManagerAddress);
  console.log("SupplyChain address:", supplyChainAddress);
  console.log();

  // Get RoleManager contract
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = RoleManager.attach(roleManagerAddress);

  // Check if already authorized
  try {
    const currentAuthorized = await roleManager.supplyChainContract();
    if (currentAuthorized.toLowerCase() === supplyChainAddress.toLowerCase()) {
      console.log("✅ SupplyChain contract is already authorized!");
      return;
    }
    console.log("Current authorized address:", currentAuthorized);
  } catch (error) {
    console.log("Could not check current authorization:", error.message);
  }

  // Authorize the contract
  console.log("Sending authorization transaction...");
  try {
    const tx = await roleManager.setSupplyChainContract(supplyChainAddress);
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    await tx.wait();
    
    console.log("\n✅ SUCCESS! SupplyChain contract is now authorized.");
    console.log("The rating system is now fully functional.\n");
  } catch (error) {
    console.error("\n❌ Authorization failed:", error.message);
    
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("\n⚠️  You are not the owner of the RoleManager contract.");
      console.log("Only the deployer can authorize contracts.");
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
