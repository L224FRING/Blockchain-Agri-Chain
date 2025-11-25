# 🌱 AgriChain - Blockchain Supply Chain Management System

A decentralized agricultural supply chain management system built on Ethereum blockchain, providing complete transparency and traceability from farm to consumer.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Smart Contracts](#smart-contracts)
- [User Roles & Workflows](#user-roles--workflows)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

AgriChain is a blockchain-based supply chain management platform designed specifically for the agricultural industry. It enables complete product traceability from farm to consumer, with built-in quality assurance through a peer-to-peer rating system.

### Key Benefits

- **Complete Transparency**: Track products through every stage of the supply chain
- **Trust & Accountability**: Blockchain-verified transactions and immutable records
- **Quality Assurance**: Peer-to-peer rating system for all participants
- **Payment Security**: Escrow-based payment system for secure transactions
- **Fraud Prevention**: Cryptographic verification prevents counterfeit products

## ✨ Features

### Core Functionality

- **Product Lifecycle Management**: Track products through 8 distinct states
- **Two-Party Confirmation System**: Secure transfers between supply chain participants
- **Payment Escrow**: Automated escrow for retailer-wholesaler transactions
- **Rating System**: 5-star rating system for farmers, wholesalers, and retailers
- **Real-Time Tracking**: Live updates on product location and status
- **Transaction Verification**: Etherscan integration for blockchain proof

### Role-Specific Features

#### 👨‍🌾 Farmer
- Add new products with detailed information
- Propose transfers to wholesalers
- Track pending proposals and sent products
- View complete product journey

#### 🏭 Wholesaler
- Receive transfer proposals from farmers
- Accept/reject farmer proposals
- Confirm receipt and set pricing with markup
- Manage retailer purchase proposals
- Rate farmers on product quality

#### 🏬 Retailer
- Browse wholesaler marketplace
- Propose purchases with payment escrow
- Confirm receipt of products
- List products for consumer sale with markup
- Rate wholesalers on service quality

#### 🛒 Consumer
- Browse retailer marketplace
- Purchase products directly
- View complete supply chain history
- Rate retailers on product quality

## 🏗️ Architecture

### System Flow

```
Farmer → (2-party confirm) → Wholesaler → (2-party confirm) → Retailer → (direct sale) → Consumer
         [Proposal System]              [Escrow Payment]              [Instant Payment]
```

### Product States

```
0: Harvested              (Farmer owns)
1: ShippedToWholesaler    (In transit to wholesaler)
2: ReceivedByWholesaler   (Wholesaler owns, can set price)
3: Processed              (Wholesaler owns, optional processing)
4: ShippedToRetailer      (In transit to retailer)
5: ReceivedByRetailer     (Retailer owns, can list for sale)
6: ForSale                (Listed for consumers)
7: SoldToConsumer         (Consumer owns, end of chain)
```

## 🛠️ Technology Stack

### Blockchain Layer
- **Solidity ^0.8.20**: Smart contract development
- **Hardhat**: Development environment and testing
- **OpenZeppelin**: Secure contract libraries
- **Ethereum (Sepolia)**: Testnet deployment

### Frontend
- **React 19**: UI framework
- **ethers.js v6**: Blockchain interaction
- **MetaMask**: Wallet integration
- **CSS3**: Custom styling with animations

### Development Tools
- **Node.js**: Runtime environment
- **npm**: Package management
- **Hardhat Console**: Contract debugging

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MetaMask browser extension
- Sepolia testnet ETH (get from [Sepolia Faucet](https://sepoliafaucet.com/))

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Blockchain-Supply-Chain
```

2. **Install Backend Dependencies**
```bash
cd supply-chain-project_v2
npm install
```

3. **Install Frontend Dependencies**
```bash
cd ../frontend_v2
npm install
```

### Configuration

1. **Set up environment variables** (supply-chain-project_v2/.env)
```env
SEPOLIA_RPC_URL=your_alchemy_or_infura_url
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

2. **Compile Smart Contracts**
```bash
cd supply-chain-project_v2
npx hardhat compile
```

3. **Deploy Contracts**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

4. **Update Frontend Configuration**

Edit `frontend_v2/src/config.js` with deployed contract addresses:
```javascript
export const SUPPLY_CHAIN_ADDRESS = "0x..."; // Your deployed address
export const ROLE_MANAGER_ADDRESS = "0x..."; // Your deployed address
```

5. **Copy ABI Files**
```bash
# From project root
cat supply-chain-project_v2/artifacts/contracts/SupplyChain.sol/SupplyChain.json | jq '{abi: .abi}' > frontend_v2/src/abi/SupplyChain.json
cat supply-chain-project_v2/artifacts/contracts/RoleManager.sol/RoleManager.json | jq '{abi: .abi}' > frontend_v2/src/abi/RoleManager.json
```

### Running the Application

1. **Start the Frontend**
```bash
cd frontend_v2
npm start
```

2. **Access the Application**
- Open http://localhost:3000
- Connect MetaMask to Sepolia network
- Register your role (Farmer, Wholesaler, Retailer, or Consumer)

## 📜 Smart Contracts

### RoleManager.sol

Manages user roles and ratings in the supply chain.

**Key Functions:**
- `registerUser(Role role, string username)`: Register with a role
- `addRating(address userToRate, uint score)`: Add rating (1-5 stars)
- `getAverageRating(address user)`: Get user's average rating
- `getUsernamesByRole(Role role)`: Get all usernames for a role

### SupplyChain.sol

Manages product lifecycle and transactions.

**Key Functions:**

*Farmer Functions:*
- `addProduct(...)`: Create new product
- `proposeTransferToWholesaler(uint _id, string wholesalerUsername)`: Propose transfer

*Wholesaler Functions:*
- `wholesalerConfirmTransfer(uint _id)`: Accept farmer proposal
- `updateProductState(uint _id, State _newState)`: Confirm receipt
- `wholesalerSetPrice(uint _id, uint _markupPercentage)`: Set price
- `wholesalerConfirmRetailerPurchase(uint _id)`: Accept retailer proposal
- `wholesalerRejectRetailerPurchase(uint _id)`: Reject retailer proposal
- `wholesalerRateFarmer(uint _id, uint score)`: Rate farmer

*Retailer Functions:*
- `proposeRetailerPurchase(uint _id)`: Propose purchase (with payment)
- `cancelRetailerProposal(uint _id)`: Cancel proposal (get refund)
- `updateProductState(uint _id, State _newState)`: Confirm receipt
- `retailerListForSale(uint _id, uint _markupPercentage)`: List for consumers
- `retailerRateWholesaler(uint _id, uint score)`: Rate wholesaler

*Consumer Functions:*
- `consumerBuyFromRetailer(uint _id)`: Purchase product
- `consumerRateRetailer(uint _id, uint score)`: Rate retailer

## 👥 User Roles & Workflows

### Farmer Workflow

1. **Add Product**: Create product with details (name, origin, quantity, price, expiry)
2. **Propose Transfer**: Select wholesaler by username
3. **Track Status**: Monitor proposal status (Awaiting/Confirmed)
4. **View History**: Track product journey after sale

### Wholesaler Workflow

1. **Review Proposals**: View incoming farmer proposals with ratings
2. **Accept Transfer**: Confirm transfer to take ownership
3. **Confirm Receipt**: Update state after receiving physical goods
4. **Rate Farmer**: Provide quality feedback (1-5 stars)
5. **Set Price**: Add markup percentage for retailers
6. **Manage Retailer Proposals**: Accept/reject retailer purchase requests
7. **Confirm Sale**: Accept retailer proposal to receive payment

### Retailer Workflow

1. **Browse Marketplace**: View available products from wholesalers
2. **Propose Purchase**: Submit purchase with payment held in escrow
3. **Track Proposals**: Monitor pending proposals
4. **Cancel if Needed**: Cancel proposal before wholesaler confirms (get refund)
5. **Confirm Receipt**: Update state after receiving products
6. **Rate Wholesaler**: Provide service feedback
7. **List for Sale**: Set markup and list for consumers

### Consumer Workflow

1. **Browse Marketplace**: View products listed by retailers
2. **View Details**: See complete supply chain history and ratings
3. **Purchase Product**: Buy directly with instant payment
4. **Rate Retailer**: Provide feedback on product quality
5. **Track History**: View complete product journey

## 📁 Project Structure

```
Blockchain-Supply-Chain/
├── supply-chain-project_v2/          # Smart contracts
│   ├── contracts/
│   │   ├── SupplyChain.sol           # Main supply chain logic
│   │   └── RoleManager.sol           # Role and rating management
│   ├── scripts/
│   │   └── deploy.js                 # Deployment script
│   ├── test/                         # Contract tests
│   ├── hardhat.config.js             # Hardhat configuration
│   └── package.json
│
├── frontend_v2/                      # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── Auth.js               # Authentication component
│   │   ├── abi/                      # Contract ABIs
│   │   │   ├── SupplyChain.json
│   │   │   └── RoleManager.json
│   │   ├── App.js                    # Main app component
│   │   ├── config.js                 # Contract addresses & constants
│   │   ├── FarmerView.js             # Farmer interface
│   │   ├── WholesalerView.js         # Wholesaler interface
│   │   ├── RetailerView.js           # Retailer interface
│   │   ├── ConsumerView.js           # Consumer interface
│   │   ├── Dashboard.js              # Product table component
│   │   ├── AddProduct.js             # Product creation form
│   │   ├── RatingBadge.js            # Rating display component
│   │   ├── StarRating.js             # Rating input component
│   │   ├── ProductHistoryModal.js    # History viewer
│   │   ├── App.css                   # Main styles
│   │   └── expiry.css                # Expiry date styles
│   └── package.json
│
└── README.md                         # This file
```

## 🚢 Deployment

### Deploy to Sepolia Testnet

1. **Ensure you have Sepolia ETH**
```bash
# Check balance
npx hardhat run scripts/checkBalance.js --network sepolia
```

2. **Deploy contracts**
```bash
cd supply-chain-project_v2
npx hardhat run scripts/deploy.js --network sepolia
```

3. **Verify contracts on Etherscan**
```bash
npx hardhat verify --network sepolia DEPLOYED_ADDRESS CONSTRUCTOR_ARGS
```

4. **Update frontend configuration**
- Copy deployed addresses to `frontend_v2/src/config.js`
- Update ABI files from artifacts

### Deploy Frontend

**Option 1: Vercel**
```bash
cd frontend_v2
vercel deploy
```

**Option 2: Netlify**
```bash
cd frontend_v2
npm run build
# Upload build/ folder to Netlify
```

**Option 3: GitHub Pages**
```bash
cd frontend_v2
npm run build
# Deploy build/ folder to gh-pages branch
```

## 🧪 Testing

### Smart Contract Tests

```bash
cd supply-chain-project_v2
npx hardhat test
```

### Test Coverage

```bash
npx hardhat coverage
```

### Local Blockchain Testing

```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Terminal 3: Run frontend
cd frontend_v2
npm start
```

## 🔒 Security Considerations

### Smart Contract Security

- ✅ **Access Control**: Role-based permissions using modifiers
- ✅ **Reentrancy Protection**: Checks-Effects-Interactions pattern
- ✅ **Payment Security**: Escrow system with refund mechanisms
- ✅ **State Machine**: Strict state transition validation
- ✅ **Anti-Spam**: One rating per product per relationship
- ✅ **Input Validation**: Comprehensive parameter checking

### Frontend Security

- ✅ **Wallet Integration**: Secure MetaMask connection
- ✅ **Transaction Signing**: User confirmation required
- ✅ **Network Validation**: Sepolia network enforcement
- ✅ **Error Handling**: Graceful failure management

## 🐛 Troubleshooting

### Common Issues

**MetaMask not connecting:**
- Ensure MetaMask is installed and unlocked
- Check you're on Sepolia network
- Refresh the page and try again

**Transaction failing:**
- Check you have sufficient Sepolia ETH
- Verify you have the correct role registered
- Ensure product is in the correct state

**Contract interaction errors:**
- Verify contract addresses in config.js
- Ensure ABI files are up to date
- Check network connection

**Products not loading:**
- Confirm you're connected to the correct network
- Check browser console for errors
- Verify contract is deployed correctly

## 📊 Gas Optimization

The contracts are optimized for gas efficiency:

- Events used for historical data instead of storage
- Minimal storage writes
- Efficient data structures (EnumerableSet)
- Batch operations where possible

Average gas costs:
- Add Product: ~150,000 gas
- Propose Transfer: ~100,000 gas
- Confirm Transfer: ~80,000 gas
- Rate User: ~50,000 gas

## 🔄 Future Enhancements

- [ ] Multi-signature wallet support
- [ ] IPFS integration for product images
- [ ] Mobile app (React Native)
- [ ] IoT sensor integration
- [ ] Advanced analytics dashboard
- [ ] Multi-chain support
- [ ] Token rewards system
- [ ] Dispute resolution mechanism

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow Solidity style guide
- Write comprehensive tests
- Update documentation
- Use meaningful commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Authors

- **Your Name** - Initial work

## 🙏 Acknowledgments

- OpenZeppelin for secure contract libraries
- Hardhat team for excellent development tools
- Ethereum community for blockchain infrastructure
- React team for the frontend framework

## 📞 Support

For support, email your-email@example.com or open an issue in the repository.

## 🔗 Links

- [Live Demo](https://your-demo-url.com)
- [Documentation](https://your-docs-url.com)
- [Etherscan (Sepolia)](https://sepolia.etherscan.io/)
- [MetaMask](https://metamask.io/)

---

**Built with ❤️ for transparent and trustworthy agricultural supply chains**
