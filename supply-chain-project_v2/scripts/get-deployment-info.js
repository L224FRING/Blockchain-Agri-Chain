const { ethers } = require("hardhat");

async function main() {
    const provider = ethers.provider;
    
    // Your contract addresses
    const SUPPLY_CHAIN_ADDRESS = "0x973Ac66B5CAe771537Ef81Cdc685CC899B2C3333";
    const ROLE_MANAGER_ADDRESS = "0xf4d9d017C5ab50F8c2332C036C15f632c7fC3E26";
    
    console.log("\n🔍 Finding Contract Deployment Information...\n");
    
    // Get current block for reference
    const currentBlock = await provider.getBlockNumber();
    console.log(`📊 Current Block: ${currentBlock}\n`);
    
    // Function to find deployment block
    async function findDeploymentBlock(address, name) {
        console.log(`\n🔎 Searching for ${name} deployment...`);
        console.log(`   Address: ${address}`);
        
        try {
            // Get contract code to verify it exists
            const code = await provider.getCode(address);
            if (code === '0x') {
                console.log(`   ❌ No contract found at this address`);
                return;
            }
            
            // Binary search to find deployment block
            let low = 0;
            let high = currentBlock;
            let deploymentBlock = null;
            
            console.log(`   🔍 Searching blocks 0 to ${currentBlock}...`);
            
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const codeAtBlock = await provider.getCode(address, mid);
                
                if (codeAtBlock !== '0x') {
                    // Contract exists at this block, search earlier
                    deploymentBlock = mid;
                    high = mid - 1;
                } else {
                    // Contract doesn't exist yet, search later
                    low = mid + 1;
                }
            }
            
            if (deploymentBlock) {
                const block = await provider.getBlock(deploymentBlock);
                const date = new Date(block.timestamp * 1000);
                
                console.log(`\n   ✅ FOUND!`);
                console.log(`   📦 Deployment Block: ${deploymentBlock}`);
                console.log(`   📅 Timestamp: ${date.toLocaleString()}`);
                console.log(`   ⏰ Unix Time: ${block.timestamp}`);
                console.log(`   🔗 Block Hash: ${block.hash}`);
                console.log(`   ⛽ Gas Used: ${block.gasUsed.toString()}`);
                
                // Try to find the exact deployment transaction
                console.log(`\n   🔍 Searching for deployment transaction in block ${deploymentBlock}...`);
                const blockWithTxs = await provider.getBlock(deploymentBlock, true);
                
                for (const tx of blockWithTxs.transactions) {
                    if (tx.to === null || tx.to === undefined) {
                        // Contract creation transaction
                        const receipt = await provider.getTransactionReceipt(tx.hash);
                        if (receipt.contractAddress && receipt.contractAddress.toLowerCase() === address.toLowerCase()) {
                            console.log(`   ✅ Deployment Transaction: ${tx.hash}`);
                            console.log(`   👤 Deployer: ${tx.from}`);
                            console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);
                            console.log(`   💰 Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} gwei`);
                            break;
                        }
                    }
                }
            } else {
                console.log(`   ❌ Could not find deployment block`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    // Find deployment info for both contracts
    await findDeploymentBlock(SUPPLY_CHAIN_ADDRESS, "SupplyChain");
    await findDeploymentBlock(ROLE_MANAGER_ADDRESS, "RoleManager");
    
    console.log("\n✅ Done!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
