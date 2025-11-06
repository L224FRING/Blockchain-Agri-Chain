// --- CONFIGURATION FOR V2 CONTRACT DEPLOYED TO SEPOLIA ---

// 1. Your NEW Deployed Contract Address (from the last deployment run)
export const SUPPLY_CHAIN_ADDRESS = "0x9e11e508908f147e3d4d6B297FCC6d56940f6Bd6";


export const STAKEHOLDER_ADDRESSES = {
    Wholesaler: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", 
    Retailer: "0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c",  
    Consumer: "0x1b3Cb81E51014b2b1337C1D1Cf9f957415F0578D"
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
      },
      {
        "internalType": "address",
        "name": "_newOwner",
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
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "getProductById",
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
          }
        ],
        "internalType": "struct SupplyChain.Product",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
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
    "inputs": [],
    "name": "productCount",
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
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "products",
    "outputs": [
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
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
