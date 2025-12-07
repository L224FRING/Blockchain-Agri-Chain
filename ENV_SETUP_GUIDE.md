# 🔧 Environment Setup Guide

This guide will help you get all the information needed for your `.env` file.

## 📋 What You Need

Your `.env` file needs three pieces of information:
1. **SEPOLIA_URL** - RPC endpoint to connect to Sepolia testnet
2. **PRIVATE_KEY** - Your wallet's private key for deployment
3. **ETHERSCAN_API_KEY** - (Optional) For verifying contracts on Etherscan

---

## 1️⃣ Getting SEPOLIA_URL (RPC Endpoint)

You need an RPC provider to interact with the Ethereum blockchain. Here are two popular options:

### Option A: Alchemy (Recommended)

1. **Go to Alchemy**: https://www.alchemy.com/
2. **Sign up** for a free account
3. **Create a new app**:
   - Click "Create new app"
   - Name: "AgriChain" (or whatever you like)
   - Chain: **Ethereum**
   - Network: **Ethereum Sepolia**
4. **Get your API key**:
   - Click on your app
   - Click "API Key" button
   - Copy the HTTPS URL (looks like: `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`)

**Your SEPOLIA_URL will look like:**
```
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/abcd1234efgh5678ijkl
```

### Option B: Infura

1. **Go to Infura**: https://www.infura.io/
2. **Sign up** for a free account
3. **Create a new project**:
   - Click "Create New Key"
   - Product: Web3 API
   - Name: "AgriChain"
4. **Get your endpoint**:
   - Select your project
   - Under "Endpoints", select **Sepolia**
   - Copy the HTTPS URL

**Your SEPOLIA_URL will look like:**
```
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

---

## 2️⃣ Getting PRIVATE_KEY (Wallet Private Key)

⚠️ **CRITICAL SECURITY WARNING**: 
- NEVER share your private key
- NEVER commit it to GitHub
- Use a separate wallet for development/testing
- This wallet should only contain testnet ETH

### Steps to Get Your Private Key:

1. **Open MetaMask** browser extension
2. **Click the three dots** (⋮) next to your account
3. **Select "Account Details"**
4. **Click "Show Private Key"**
5. **Enter your MetaMask password**
6. **Copy the private key** (64 character hex string)

**Your PRIVATE_KEY will look like:**
```
PRIVATE_KEY=abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yz567890abcd1234
```

**Note:** Remove the `0x` prefix if it's there!

### Get Sepolia Test ETH

Your wallet needs Sepolia ETH to deploy contracts. Get free testnet ETH from:

- **Alchemy Faucet**: https://sepoliafaucet.com/
- **Infura Faucet**: https://www.infura.io/faucet/sepolia
- **QuickNode Faucet**: https://faucet.quicknode.com/ethereum/sepolia

You'll need about 0.1 Sepolia ETH for deployment.

---

## 3️⃣ Getting ETHERSCAN_API_KEY (Optional)

This is only needed if you want to verify your contracts on Etherscan (makes them readable on the blockchain explorer).

1. **Go to Etherscan**: https://etherscan.io/
2. **Sign up** for a free account
3. **Go to API Keys**: https://etherscan.io/myapikey
4. **Click "Add"** to create a new API key
5. **Copy the API key**

**Your ETHERSCAN_API_KEY will look like:**
```
ETHERSCAN_API_KEY=ABC123DEF456GHI789JKL012MNO345P
```

---

## 📝 Creating Your .env File

1. **Navigate to the backend folder**:
   ```bash
   cd supply-chain-project_v2
   ```

2. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

3. **Edit the .env file** with your values:
   ```bash
   nano .env
   # or use any text editor
   ```

4. **Your final .env should look like**:
   ```env
   SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ACTUAL_KEY
   PRIVATE_KEY=your_actual_private_key_without_0x
   ETHERSCAN_API_KEY=YOUR_ACTUAL_ETHERSCAN_KEY
   ```

5. **Save and close** the file

---

## ✅ Verify Your Setup

Test that everything works:

```bash
cd supply-chain-project_v2

# Check if .env is loaded correctly
npx hardhat compile

# Test deployment on local network (no cost)
npx hardhat node  # Terminal 1
npx hardhat run scripts/deploy.js --network localhost  # Terminal 2
```

If compilation works, you're ready to deploy to Sepolia!

---

## 🔒 Security Checklist

- [ ] `.env` file is in `.gitignore` (it should be by default)
- [ ] Never share your private key with anyone
- [ ] Use a separate wallet for development
- [ ] Only keep testnet ETH in your development wallet
- [ ] Never use your main wallet's private key

---

## 🆘 Troubleshooting

### "Cannot find module 'dotenv'"
```bash
npm install dotenv
```

### "Invalid API Key" or "Network Error"
- Double-check your SEPOLIA_URL is correct
- Make sure there are no extra spaces
- Verify your Alchemy/Infura project is active

### "Insufficient funds"
- Get more Sepolia ETH from faucets
- Wait a few minutes for faucet transactions to confirm

### "Private key is invalid"
- Make sure you removed the `0x` prefix
- Verify it's exactly 64 characters
- No spaces or line breaks

---

## 📚 Additional Resources

- **Alchemy Docs**: https://docs.alchemy.com/
- **Infura Docs**: https://docs.infura.io/
- **Hardhat Docs**: https://hardhat.org/docs
- **Sepolia Faucets**: https://sepoliafaucet.com/

---

Need help? Check the error messages carefully - they usually tell you exactly what's wrong!
