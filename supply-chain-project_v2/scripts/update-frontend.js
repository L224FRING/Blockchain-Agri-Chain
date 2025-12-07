const fs = require('fs');
const path = require('path');

/**
 * This script copies ABI files from Hardhat artifacts to the frontend
 * and updates the config.js with new contract addresses.
 * 
 * Usage: node scripts/update-frontend.js <RoleManagerAddress> <SupplyChainAddress>
 */

async function main() {
  // Get addresses from command line arguments
  const roleManagerAddress = process.argv[2];
  const supplyChainAddress = process.argv[3];

  if (!roleManagerAddress || !supplyChainAddress) {
    console.error('❌ Error: Please provide both contract addresses');
    console.log('Usage: node scripts/update-frontend.js <RoleManagerAddress> <SupplyChainAddress>');
    process.exit(1);
  }

  console.log('🔄 Updating frontend with new contract data...\n');

  // Paths
  const projectRoot = path.join(__dirname, '../..');
  const artifactsPath = path.join(__dirname, '../artifacts/contracts');
  const frontendAbiPath = path.join(projectRoot, 'frontend_v2/src/abi');
  const configPath = path.join(projectRoot, 'frontend_v2/src/config.js');

  // Step 1: Copy SupplyChain ABI
  console.log('📋 Copying SupplyChain ABI...');
  try {
    const supplyChainArtifact = require(path.join(artifactsPath, 'SupplyChain.sol/SupplyChain.json'));
    const supplyChainAbi = { abi: supplyChainArtifact.abi };
    
    fs.writeFileSync(
      path.join(frontendAbiPath, 'SupplyChain.json'),
      JSON.stringify(supplyChainAbi, null, 2)
    );
    console.log('✅ SupplyChain ABI copied');
  } catch (error) {
    console.error('❌ Error copying SupplyChain ABI:', error.message);
    process.exit(1);
  }

  // Step 2: Copy RoleManager ABI
  console.log('📋 Copying RoleManager ABI...');
  try {
    const roleManagerArtifact = require(path.join(artifactsPath, 'RoleManager.sol/RoleManager.json'));
    const roleManagerAbi = { abi: roleManagerArtifact.abi };
    
    fs.writeFileSync(
      path.join(frontendAbiPath, 'RoleManager.json'),
      JSON.stringify(roleManagerAbi, null, 2)
    );
    console.log('✅ RoleManager ABI copied');
  } catch (error) {
    console.error('❌ Error copying RoleManager ABI:', error.message);
    process.exit(1);
  }

  // Step 3: Update config.js
  console.log('📝 Updating config.js with new addresses...');
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Replace SUPPLY_CHAIN_ADDRESS
    configContent = configContent.replace(
      /export const SUPPLY_CHAIN_ADDRESS = "0x[a-fA-F0-9]{40}";/,
      `export const SUPPLY_CHAIN_ADDRESS = "${supplyChainAddress}";`
    );
    
    // Replace ROLE_MANAGER_ADDRESS
    configContent = configContent.replace(
      /export const ROLE_MANAGER_ADDRESS = "0x[a-fA-F0-9]{40}";/,
      `export const ROLE_MANAGER_ADDRESS = "${roleManagerAddress}";`
    );
    
    fs.writeFileSync(configPath, configContent);
    console.log('✅ config.js updated');
  } catch (error) {
    console.error('❌ Error updating config.js:', error.message);
    process.exit(1);
  }

  // Summary
  console.log('\n✨ Frontend update complete!\n');
  console.log('📝 Updated addresses:');
  console.log(`   RoleManager:  ${roleManagerAddress}`);
  console.log(`   SupplyChain:  ${supplyChainAddress}`);
  console.log('\n⚠️  IMPORTANT: You still need to authorize the SupplyChain contract!');
  console.log('   Run: npx hardhat run scripts/authorize-contract.js --network sepolia\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
