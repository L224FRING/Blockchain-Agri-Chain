# Requirements Document

## Introduction

This feature enhances the AgriChain supply chain system by implementing a two-party confirmation mechanism for wholesaler-to-retailer transfers (similar to the existing farmer-to-wholesaler flow) and adds a complete Consumer role with marketplace and purchase capabilities.

## Glossary

- **System**: The AgriChain blockchain-based supply chain tracking application
- **Wholesaler**: A supply chain participant who purchases from farmers and sells to retailers
- **Retailer**: A supply chain participant who purchases from wholesalers and sells to consumers
- **Consumer**: An end-user who purchases products from retailers
- **Transfer Proposal**: A blockchain record proposing ownership transfer between parties
- **Confirmation**: An on-chain transaction where a party accepts a transfer proposal
- **Marketplace**: A view displaying products available for purchase
- **Product State**: The current stage of a product in the supply chain (enum values 0-7)

## Requirements

### Requirement 1: Wholesaler-to-Retailer Confirmation System

**User Story:** As a retailer, I want to propose purchases to wholesalers and have them confirm before ownership transfers, so that wholesalers maintain control over their inventory until they explicitly approve sales.

#### Acceptance Criteria

1. WHEN a Retailer views products in states ReceivedByWholesaler (2) or Processed (3), THE System SHALL display a "Propose Purchase" action button
2. WHEN a Retailer clicks "Propose Purchase" for a product, THE System SHALL create a transfer proposal record on the blockchain with retailer confirmation set to true
3. WHEN a transfer proposal is created, THE System SHALL emit a TransferProposedToRetailer event containing product ID, retailer address, and wholesaler address
4. WHEN a Wholesaler views their inventory, THE System SHALL display pending retailer purchase proposals with retailer information
5. WHEN a Wholesaler confirms a retailer purchase proposal, THE System SHALL execute the ownership transfer, update product state to ReceivedByRetailer (5), transfer payment to wholesaler, and emit confirmation events

### Requirement 2: Consumer Role and Marketplace

**User Story:** As a consumer, I want to browse products listed by retailers and purchase them, so that I can buy agricultural products with full supply chain transparency.

#### Acceptance Criteria

1. WHEN a Consumer logs into the System, THE System SHALL display a marketplace view showing all products in ForSale state (6)
2. WHEN a Consumer views the marketplace, THE System SHALL display product details including name, origin, quantity, price, expiry date, farmer rating, and wholesaler rating
3. WHEN a Consumer clicks "Buy Now" on a product, THE System SHALL initiate a blockchain transaction transferring payment to the retailer and updating product ownership
4. WHEN a Consumer purchase is confirmed, THE System SHALL update the product state to SoldToConsumer (7) and transfer ownership to the consumer address
5. WHEN a Consumer views their purchase history, THE System SHALL display all products they own with full supply chain traceability

### Requirement 3: Retailer Listing Workflow

**User Story:** As a retailer, I want to list products for sale to consumers after receiving them, so that I can control when products become available in the consumer marketplace.

#### Acceptance Criteria

1. WHEN a Retailer owns a product in ReceivedByRetailer state (5), THE System SHALL display a "List for Sale" action button
2. WHEN a Retailer clicks "List for Sale", THE System SHALL update the product state to ForSale (6) via blockchain transaction
3. WHEN a product is listed for sale, THE System SHALL make it visible in the Consumer marketplace view
4. WHEN a Retailer sets a price for listing, THE System SHALL allow markup percentage input and calculate the new price based on the wholesaler price
5. WHILE a product is in ForSale state (6), THE System SHALL display it in both the Retailer inventory and Consumer marketplace

### Requirement 4: Consumer Rating System

**User Story:** As a consumer, I want to rate retailers after purchasing products, so that I can provide feedback on product quality and service.

#### Acceptance Criteria

1. WHEN a Consumer owns a product in SoldToConsumer state (7), THE System SHALL display a star rating interface (1-5 stars) for rating the retailer
2. WHEN a Consumer submits a rating, THE System SHALL call the RoleManager contract to record the rating for the retailer address
3. WHEN a rating is submitted, THE System SHALL set the retailerRated flag to true to prevent duplicate ratings
4. IF a Consumer attempts to rate a retailer twice for the same product, THEN THE System SHALL reject the transaction with an error message
5. WHEN any user views a product, THE System SHALL display the retailer rating badge if the retailer has been rated

### Requirement 5: Smart Contract Updates

**User Story:** As a system administrator, I want the smart contracts to support retailer-wholesaler proposals and consumer purchases, so that the blockchain logic enforces the new workflows.

#### Acceptance Criteria

1. THE SupplyChain contract SHALL add a RetailerTransferProposal struct with fields: productId, proposer (retailer), target (wholesaler), retailerConfirmed, wholesalerConfirmed, executed, and proposedPrice
2. THE SupplyChain contract SHALL implement a proposeRetailerPurchase function that creates a proposal and requires payment to be held in escrow
3. THE SupplyChain contract SHALL implement a wholesalerConfirmRetailerPurchase function that transfers payment and ownership when confirmed
4. THE SupplyChain contract SHALL implement a consumerBuyFromRetailer function that handles consumer purchases with payment transfer
5. THE SupplyChain contract SHALL implement a consumerRateRetailer function that allows consumers to rate retailers with anti-spam protection

### Requirement 6: Product Struct Enhancement

**User Story:** As a developer, I want the Product struct to track retailer information and rating flags, so that the system maintains complete supply chain history.

#### Acceptance Criteria

1. THE Product struct SHALL add a retailer field of type address to track the retailer who sold the product
2. THE Product struct SHALL add a retailerRated field of type bool to prevent duplicate consumer ratings
3. WHEN a product is transferred to a retailer, THE System SHALL set the retailer field to the retailer's address
4. WHEN a consumer rates a retailer, THE System SHALL set the retailerRated flag to true
5. WHEN the System fetches product data, THE System SHALL include retailer address and retailerRated flag in the response

### Requirement 7: Frontend View Components

**User Story:** As a user, I want intuitive interfaces for each role's specific workflows, so that I can easily perform my supply chain activities.

#### Acceptance Criteria

1. THE RetailerView component SHALL display two sections: "Wholesaler Marketplace" for proposing purchases and "My Inventory" for owned products
2. THE ConsumerView component SHALL display two sections: "Retailer Marketplace" for browsing products and "My Purchases" for purchase history
3. WHEN a Retailer views the marketplace, THE System SHALL show products with "Propose Purchase" buttons and display pending proposals
4. WHEN a Wholesaler views inventory, THE System SHALL show an "Incoming Retailer Proposals" section with accept/reject actions
5. WHEN a Consumer views the marketplace, THE System SHALL show products with "Buy Now" buttons and real-time price information

### Requirement 8: Payment Escrow for Retailer Proposals

**User Story:** As a wholesaler, I want retailer payments held in escrow until I confirm the sale, so that I'm guaranteed payment when I release inventory.

#### Acceptance Criteria

1. WHEN a Retailer proposes a purchase, THE System SHALL require the retailer to send the full payment amount with the proposal transaction
2. WHILE a proposal is pending, THE System SHALL hold the payment in the SupplyChain contract
3. WHEN a Wholesaler confirms a proposal, THE System SHALL transfer the escrowed payment to the wholesaler's address
4. IF a Wholesaler rejects a proposal, THEN THE System SHALL refund the escrowed payment to the retailer's address
5. WHEN a proposal expires or is cancelled, THE System SHALL automatically refund the payment to the retailer
