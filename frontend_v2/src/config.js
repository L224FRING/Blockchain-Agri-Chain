import supplyChainArtifact from './abi/SupplyChain.json';
import roleManagerArtifact from './abi/RoleManager.json';

// --- Contract Addresses (Sepolia) ---
export const SUPPLY_CHAIN_ADDRESS = "0x983c61437E02eC0C07b3fdAD0FEAa205Cf23e78C";
export const ROLE_MANAGER_ADDRESS = "0x537E59BF016a9213Ed98Bc49Ea81Af165CA0D153";

// --- ABIs (synced from Hardhat artifacts) ---
export const SUPPLY_CHAIN_ABI = supplyChainArtifact.abi;
export const ROLE_MANAGER_ABI = roleManagerArtifact.abi;

// --- Shared Constants ---
export const FOR_SALE_STATES = [2, 3]; // Wholesaler products available for retailer purchase
export const RETAILER_FOR_SALE_STATES = [6]; // Retailer products available for consumer purchase

export const STATE_MAPPING = {
  0: "Harvested",
  1: "Shipped To Wholesaler",
  2: "Received By Wholesaler",
  3: "Processed",
  4: "Shipped To Retailer",
  5: "Received By Retailer",
  6: "For Sale",
  7: "Sold To Consumer"
};

export const AUTHORIZED_ADDRESSES = {
  Farmer: [
    "0x1234567890123456789012345678901234567890",
    "0x2345678901234567890123456789012345678901",
    "0xe7015C0968F8d08a03C9Be042496367954E4C859"
  ],
  Wholesaler: [
    "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"
  ],
  Retailer: [
    "0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c"
  ],
  Consumer: [
    "0x1b3Cb81E51014b2b1337C1D1Cf9f957415F0578D"
  ]
};

export const getRoleByAddress = (address) => {
  if (!address) return null;
  const normalized = address.toLowerCase();
  for (const [role, addresses] of Object.entries(AUTHORIZED_ADDRESSES)) {
    if (addresses.some((addr) => addr.toLowerCase() === normalized)) {
      return role;
    }
  }
  return null;
};

