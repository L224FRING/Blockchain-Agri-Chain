const { ethers } = require("hardhat");
const { execSync } = require('child_process');

/**
 * Complete deployment script that:
 * 1. Deploys both contracts
 * 2. Authorizes SupplyChain in RoleManager
 * 3. Updates frontend files
 * 
 * Usage: npx hardhat run scripts/deploy-and-setup.js --network sepolia
 */

async function main() {
  console.log("🚀 Starting complete deployment and setup...\n");
  console.log("=" .repeat(60));
  
  // Step 1: Deploy contracts
  console.log("\n📦 STEP 1: Deploying Contracts");
  console.log("=" .repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy RoleManager
  console.log("Deploying RoleManager...");
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = await RoleManager.deploy();
  await roleManager.waitForDeployment();
  const roleManagerAddress = await roleManager.getAddress();
  console.log("✅ RoleManager deployed to:", roleManagerAddress);

  // Deploy SupplyChain
  console.log("\nDeploying SupplyChain...");
  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const supplyChain = await SupplyChain.deploy(roleManagerAddress);
  await supplyChain.waitForDeployment();
  const supplyChainAddress = await supplyChain.getAddress();
  console.log("✅ SupplyChain deployed to:", supplyChainAddress);

  // Step 2: Authorize SupplyChain
  console.log("\n=" .repeat(60));
  console.log("🔐 STEP 2: Authorizing SupplyChain Contract");
  console.log("=" .repeat(60));
  
  console.log("Setting SupplyChain as authorized contract...");
  const tx = await roleManager.setSupplyChainContract(supplyChainAddress);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ Authorization complete!");

  // Step 3: Update frontend
  console.log("\n=" .repeat(60));
  console.log("📝 STEP 3: Updating Frontend");
  console.log("=" .repeat(60));
  
  try {
    console.log("Running update-frontend script...");
    execSync(
      `node scripts/update-frontend.js ${roleManagerAddress} ${supplyChainAddress}`,
      { stdio: 'inherit', cwd: __dirname + '/..' }
    );
  } catch (error) {
    console.error("❌ Error updating frontend:", error.message);
    console.log("\n⚠️  You can manually update by running:");
    console.log(`   node scripts/update-frontend.js ${roleManagerAddress} ${supplyChainAddress}`);
  }

  // Final Summary
  console.log("\n" + "=" .repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(60));
  console.log("\n📝 Contract Addresses:");
  console.log(`   RoleManager:  ${roleManagerAddress}`);
  console.log(`   SupplyChain:  ${supplyChainAddress}`);
  console.log("\n🔗 View on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${roleManagerAddress}`);
  console.log(`   https://sepolia.etherscan.io/address/${supplyChainAddress}`);
  console.log("\n✅ Next Steps:");
  console.log("   1. Restart your frontend: cd frontend_v2 && npm start");
  console.log("   2. Clear browser localStorage (or use incognito mode)");
  console.log("   3. Connect MetaMask and register your role");
  console.log("\n💡 Optional: Verify contracts on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${roleManagerAddress}`);
  console.log(`   npx hardhat verify --network sepolia ${supplyChainAddress} ${roleManagerAddress}`);
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
