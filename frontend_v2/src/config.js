// --- CONFIGURATION FOR V2 CONTRACTS DEPLOYED TO SEPOLIA ---

// Contract Addresses
export const SUPPLY_CHAIN_ADDRESS = "0x5fB4045F2242514a2b4872894Daf0eb95B28CcDF";
export const ROLE_MANAGER_ADDRESS = "0xdFCE285bdD4c6a6b2b3901345742ef9c5b6c9074";

// Role Manager ABI
export const ROLE_MANAGER_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "getAddressByUsername",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getRole",
    "outputs": [
      {
        "internalType": "enum RoleManager.Role",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getRoleAsString",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum RoleManager.Role",
        "name": "role",
        "type": "uint8"
      }
    ],
    "name": "getRoleCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUsername",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum RoleManager.Role",
        "name": "role",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "registerUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "revokeRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum RoleManager.Role",
        "name": "",
        "type": "uint8"
      }
    ],
    "name": "roleCounts",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userRoles",
    "outputs": [
      {
        "internalType": "enum RoleManager.Role",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "usernames",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];


// Authorized addresses for each role
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

// Helper function to get role by address
export const getRoleByAddress = (address) => {
    if (!address) return null;
    address = address.toLowerCase();
    
    for (const [role, addresses] of Object.entries(AUTHORIZED_ADDRESSES)) {
        if (addresses.map(addr => addr.toLowerCase()).includes(address.toLowerCase())) {
            return role;
        }
    }
    return null;
};

// 3. Product State Enum Mapping
// This MUST match the order of the State enum in your Solidity contract (0, 1, 2, ...)
export const STATE_MAPPING = {
    0: "Harvested (Ready to Ship)",
    1: "Shipped To Wholesaler",
    2: "Received By Wholesaler",
    3: "Processed / Packaged",
    4: "Shipped To Retailer",
    5: "Received By Retailer",
    6: "For Sale",
    7: "Sold To Consumer"
};

// 4. Your Contract's ABI (from the updated SupplyChain.json)
export const SUPPLY_CHAIN_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_roleManager",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quantity",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "unit",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "pricePerUnit",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum SupplyChain.State",
        "name": "initialState",
        "type": "uint8"
      }
    ],
    "name": "ProductAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum SupplyChain.State",
        "name": "oldState",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "enum SupplyChain.State",
        "name": "newState",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "stakeholder",
        "type": "address"
      }
    ],
    "name": "ProductStateUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "txHash",
        "type": "string"
      }
    ],
    "name": "HashUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "by",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "role",
        "type": "string"
      }
    ],
    "name": "TransferConfirmed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "TransferExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "toUsername",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "toAddress",
        "type": "address"
      }
    ],
    "name": "TransferProposed",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_origin",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_quantity",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_unit",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_pricePerUnit",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_expiryDate",
        "type": "uint256"
      }
    ],
    "name": "addProduct",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllProducts",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "origin",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "transactionHash",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "quantity",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "unit",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "pricePerUnit",
            "type": "uint256"
          },
          {
            "internalType": "enum SupplyChain.State",
            "name": "currentState",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "expiryDate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "creationTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastUpdateTimestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct SupplyChain.Product[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "wholesalerUsername",
        "type": "string"
      }
    ],
    "name": "proposeTransferToWholesaler",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "roleManager",
    "outputs": [
      {
        "internalType": "contract IRoleManager",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "transferProposals",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "proposer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "target",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "targetUsername",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "farmerConfirmed",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "wholesalerConfirmed",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "executed",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "updateProductHash",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      },
      {
        "internalType": "enum SupplyChain.State",
        "name": "_newState",
        "type": "uint8"
      }
    ],
    "name": "updateProductState",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "wholesalerConfirmTransfer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
