require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // This line loads your .env file

// Get the variables from the .env file
const { SEPOLIA_URL, PRIVATE_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20", // Matches our contract
  networks: {
    sepolia: {
      url: SEPOLIA_URL,
      accounts: [PRIVATE_KEY]
    }
  }
};