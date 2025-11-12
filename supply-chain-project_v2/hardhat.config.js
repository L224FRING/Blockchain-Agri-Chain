require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // This line loads your .env file

// Get the variables from the .env file
const { SEPOLIA_URL, PRIVATE_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20", // Make sure this matches your pragma
    settings: {
      optimizer: {
        enabled: true, // This is the fix
        runs: 200,      // This is a standard value
      },
        viaIR: true,  
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_URL,
      accounts: [PRIVATE_KEY]
    }
  }
};
