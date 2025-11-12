# Design Document

## Overview

This design implements a two-party confirmation system for wholesaler-to-retailer transfers and adds a complete Consumer role to the AgriChain supply chain system. The design follows the existing farmer-to-wholesaler pattern and extends it to cover the entire supply chain from farm to consumer.

## Architecture

### High-Level Flow

```
Farmer → (2-party confirm) → Wholesaler → (2-party confirm) → Retailer → (direct sale) → Consumer
         [existing]                        [NEW]                          [NEW]
```

### State Transitions

The product state flow will be enhanced:

```
0: Harvested (Farmer owns)
1: ShippedToWholesaler (Wholesaler owns, in transit)
2: ReceivedByWholesaler (Wholesaler owns, can set price)
3: Processed (Wholesaler owns, optional processing step)
4: ShippedToRetailer (Retailer owns, in transit) [NEW STATE USAGE]
5: ReceivedByRetailer (Retailer owns, can list for sale)
6: ForSale (Retailer owns, listed for consumers)
7: SoldToConsumer (Consumer owns, end of chain)
```

## Components and Interfaces

### Smart Contract Changes

#### 1. SupplyChain.sol - New Structs

```solidity
struct RetailerTransferProposal {
    uint productId;
    address proposer;        // retailer address
    address target;          // wholesaler address
    uint proposedPrice;      // price retailer will pay
    bool retailerConfirmed;  // always true when created
    bool wholesalerConfirmed;
    bool executed;
}

// Add to Product struct:
struct Product {
    // ... existing fields ...
    address retailer;        // NEW: track retailer
    bool retailerRated;      // NEW: anti-spam for consumer ratings
}
```

#### 2. SupplyChain.sol - New Mappings

```solidity
// Separate mapping for retailer proposals (parallel to transferProposals)
mapping(uint => RetailerTransferProposal) public retailerTransferProposals;

// Track escrowed payments
mapping(uint => uint) public escrowedPayments;
```

#### 3. SupplyChain.sol - New Functions

**Retailer Functions:**
```solidity
function proposeRetailerPurchase(uint _id) public payable
    - Requires: product in state 2 or 3, caller is Retailer role
    - Requires: msg.value == product.pricePerUnit
    - Creates RetailerTransferProposal with retailerConfirmed = true
    - Stores payment in escrowedPayments[_id]
    - Emits: RetailerPurchaseProposed event

function cancelRetailerProposal(uint _id) public
    - Requires: caller is proposer, not executed, not wholesaler confirmed
    - Refunds escrowed payment
    - Deletes proposal
    - Emits: RetailerProposalCancelled event

function retailerListForSale(uint _id, uint _markupPercentage) public
    - Requires: owner, state == ReceivedByRetailer (5)
    - Calculates new price with markup
    - Updates state to ForSale (6)
    - Emits: ProductListedForSale event
```

**Wholesaler Functions:**
```solidity
function wholesalerConfirmRetailerPurchase(uint _id) public
    - Requires: caller is target wholesaler, proposal exists
    - Transfers escrowed payment to wholesaler
    - Transfers ownership to retailer
    - Updates state to ShippedToRetailer (4)
    - Sets product.retailer = proposer
    - Marks proposal as executed
    - Emits: RetailerPurchaseConfirmed, OwnershipTransferred events

function wholesalerRejectRetailerPurchase(uint _id) public
    - Requires: caller is target wholesaler
    - Refunds escrowed payment to retailer
    - Deletes proposal
    - Emits: RetailerProposalRejected event
```

**Consumer Functions:**
```solidity
function consumerBuyFromRetailer(uint _id) public payable
    - Requires: caller is Consumer role, product state == ForSale (6)
    - Requires: msg.value == product.pricePerUnit
    - Transfers payment to retailer (current owner)
    - Transfers ownership to consumer
    - Updates state to SoldToConsumer (7)
    - Emits: ConsumerPurchase, OwnershipTransferred events

function consumerRateRetailer(uint _id, uint score) public
    - Requires: caller is owner, state == SoldToConsumer (7)
    - Requires: !product.retailerRated
    - Sets product.retailerRated = true
    - Calls roleManager.addRating(product.retailer, score)
    - Emits: ProductRated event
```

**State Update Function Enhancement:**
```solidity
function updateProductState(uint _id, State _newState) public
    - Add new transition: ShippedToRetailer (4) → ReceivedByRetailer (5)
    - Retailer can confirm receipt after wholesaler ships
```

#### 4. New Events

```solidity
event RetailerPurchaseProposed(uint indexed productId, address indexed retailer, address indexed wholesaler, uint price);
event RetailerPurchaseConfirmed(uint indexed productId, address indexed wholesaler, address indexed retailer);
event RetailerProposalRejected(uint indexed productId, address indexed wholesaler, address indexed retailer);
event RetailerProposalCancelled(uint indexed productId, address indexed retailer);
event ProductListedForSale(uint indexed productId, uint oldPrice, uint newPrice, address indexed retailer);
event ConsumerPurchase(uint indexed productId, address indexed consumer, address indexed retailer, uint price);
```

### Frontend Changes

#### 1. RetailerView.js - Enhanced Component

**Structure:**
```javascript
RetailerView
├── Wholesaler Marketplace Section
│   ├── Products in states 2 or 3 (not owned by me)
│   ├── "Propose Purchase" button (sends payment)
│   └── Shows pending proposals I've made
├── Pending Confirmations Section (NEW)
│   ├── Products I proposed to buy (waiting for wholesaler)
│   └── "Cancel Proposal" button (refunds payment)
└── My Inventory Section
    ├── Products I own in state 4 (shipped to me)
    │   └── "Confirm Receipt" button → state 5
    ├── Products I own in state 5 (received)
    │   └── "List for Sale" button with markup input → state 6
    └── Products I own in state 6 or 7 (listed/sold)
```

**New Functions:**
```javascript
handleProposePurchase(productId, price)
    - Calls proposeRetailerPurchase with value: price
    - Shows loading state during transaction
    - Refreshes products on success

handleCancelProposal(productId)
    - Calls cancelRetailerProposal
    - Refunds payment to retailer

handleConfirmReceipt(productId)
    - Calls updateProductState(productId, 5)
    - Moves from ShippedToRetailer to ReceivedByRetailer

handleListForSale(productId, markupPercentage)
    - Validates markup input
    - Calls retailerListForSale(productId, markup)
    - Updates state to ForSale (6)
```

#### 2. WholesalerView.js - Enhanced Component

**Add New Section:**
```javascript
Incoming Retailer Proposals Section (NEW)
├── Fetches retailerTransferProposals for my products
├── Displays: Product info, Retailer address, Proposed price
├── Actions:
│   ├── "Accept Purchase" button → wholesalerConfirmRetailerPurchase
│   └── "Reject Purchase" button → wholesalerRejectRetailerPurchase
```

**New Functions:**
```javascript
fetchRetailerProposals()
    - Loops through owned products in states 2 or 3
    - Checks retailerTransferProposals[productId]
    - Filters for proposals where target == connectedWallet
    - Returns pending proposals

handleAcceptRetailerPurchase(productId)
    - Calls wholesalerConfirmRetailerPurchase
    - Receives payment from escrow
    - Transfers ownership to retailer

handleRejectRetailerPurchase(productId)
    - Calls wholesalerRejectRetailerPurchase
    - Refunds payment to retailer
```

#### 3. ConsumerView.js - New Component

**Structure:**
```javascript
ConsumerView
├── Retailer Marketplace Section
│   ├── Fetches all products in ForSale state (6)
│   ├── Displays: Name, Origin, Quantity, Price, Expiry, Ratings
│   ├── Shows: Farmer rating, Wholesaler rating, Retailer rating
│   └── "Buy Now" button → consumerBuyFromRetailer
└── My Purchases Section
    ├── Fetches products owned by consumer (state 7)
    ├── Displays full supply chain history
    ├── Shows: Farmer → Wholesaler → Retailer → Me
    └── Rating interface for retailer (if not rated)
```

**Functions:**
```javascript
handleBuyProduct(productId, price)
    - Validates consumer has sufficient balance
    - Calls consumerBuyFromRetailer with value: price
    - Shows transaction confirmation
    - Refreshes products

handleRateRetailer(productId, score)
    - Validates score (1-5)
    - Calls consumerRateRetailer(productId, score)
    - Updates UI to show rating submitted
```

#### 4. Dashboard.js - ProductActions Enhancement

**Add New Action Logic:**
```javascript
// For Retailer role:
if (currentRole === 'Retailer') {
    // In Marketplace view (not owner, states 2 or 3)
    if (!isOwner && WHOLESALER_FOR_SALE_STATES.includes(product.currentState)) {
        return <button onClick={() => onAction(product.id, product.pricePerUnit)}>
            Propose Purchase (Pay Now)
        </button>
    }
    
    // In Inventory view (owner, state 4)
    if (isOwner && product.currentState === 4) {
        return <button onClick={() => onAction(product.id)}>
            Confirm Receipt
        </button>
    }
    
    // In Inventory view (owner, state 5)
    if (isOwner && product.currentState === 5) {
        return <MarkupInput onSubmit={(markup) => onSetPrice(product.id, markup)} />
    }
    
    // In Inventory view (owner, states 6 or 7)
    if (isOwner && (product.currentState === 6 || product.currentState === 7)) {
        if (!product.retailerRated && product.currentState === 7) {
            return <StarRating onRate={(score) => onRate(product.id, score)} />
        }
    }
}

// For Consumer role:
if (currentRole === 'Consumer') {
    // In Marketplace view (not owner, state 6)
    if (!isOwner && product.currentState === 6) {
        return <button onClick={() => onAction(product.id, product.pricePerUnit)}>
            Buy Now
        </button>
    }
    
    // In My Purchases view (owner, state 7)
    if (isOwner && product.currentState === 7 && !product.retailerRated) {
        return <StarRating onRate={(score) => onRate(product.id, score)} />
    }
}
```

#### 5. RatingBadge.js - Add Retailer Support

**Enhancement:**
```javascript
// In Dashboard product display, add retailer rating:
<RatingBadge userAddress={product.farmer} label="Farmer" />
{product.wholesaler && <RatingBadge userAddress={product.wholesaler} label="Wholesaler" />}
{product.retailer && <RatingBadge userAddress={product.retailer} label="Retailer" />}
```

#### 6. config.js - Update State Mapping

```javascript
export const STATE_MAPPING = {
  0: "Harvested",
  1: "Shipped To Wholesaler",
  2: "Received By Wholesaler",
  3: "Processed",
  4: "Shipped To Retailer",        // Now actively used
  5: "Received By Retailer",
  6: "For Sale",
  7: "Sold To Consumer"            // Updated label
};

export const RETAILER_FOR_SALE_STATES = [6]; // Products consumers can buy
```

## Data Models

### Product Data Flow

```javascript
// Frontend product object structure:
{
    id: number,
    name: string,
    origin: string,
    owner: address,
    farmer: address,
    wholesaler: address,
    retailer: address,          // NEW
    txHash: string,
    quantity: bigint,
    unit: string,
    pricePerUnit: bigint,
    currentState: number,
    expiryDate: bigint,
    farmerRated: boolean,
    wholesalerRated: boolean,
    retailerRated: boolean      // NEW
}
```

### Proposal Data Structures

```javascript
// Retailer Transfer Proposal (frontend):
{
    productId: number,
    proposer: address,          // retailer
    target: address,            // wholesaler
    proposedPrice: bigint,
    retailerConfirmed: boolean,
    wholesalerConfirmed: boolean,
    executed: boolean
}
```

## Error Handling

### Smart Contract Errors

1. **proposeRetailerPurchase:**
   - "Incorrect payment amount sent" - msg.value != pricePerUnit
   - "Product not for sale by wholesaler" - state not 2 or 3
   - "Caller must be a Retailer" - role check fails
   - "Active proposal exists" - proposal already pending

2. **wholesalerConfirmRetailerPurchase:**
   - "Only target wholesaler can confirm" - caller != target
   - "No active proposal" - proposal doesn't exist
   - "Proposal already executed" - executed == true

3. **consumerBuyFromRetailer:**
   - "Product not for sale" - state != 6
   - "Incorrect payment amount" - msg.value != pricePerUnit
   - "Caller must be a Consumer" - role check fails

4. **consumerRateRetailer:**
   - "Retailer has already been rated" - retailerRated == true
   - "Can only rate after purchase" - state != 7
   - "Only owner can rate" - caller != owner

### Frontend Error Handling

```javascript
// Standardized error handling pattern:
try {
    const tx = await contract.functionName(...);
    setActionMessage('Transaction submitted...');
    await tx.wait();
    setActionMessage('✅ Success!');
    fetchProducts();
} catch (error) {
    if (error.code === 4001) {
        setActionMessage('Error: Transaction rejected by user.');
    } else if (error.message.includes('specific error')) {
        setActionMessage('Error: User-friendly message');
    } else {
        setActionMessage('Error: Transaction failed. Check console.');
    }
    console.error('Detailed error:', error);
}
```

## Testing Strategy

### Unit Tests (Smart Contracts)

1. **Retailer Proposal Tests:**
   - Test proposal creation with correct payment
   - Test proposal rejection with incorrect payment
   - Test proposal cancellation and refund
   - Test duplicate proposal prevention

2. **Wholesaler Confirmation Tests:**
   - Test successful confirmation and payment transfer
   - Test rejection and refund
   - Test unauthorized confirmation attempts

3. **Consumer Purchase Tests:**
   - Test successful purchase with payment
   - Test purchase of non-ForSale products (should fail)
   - Test incorrect payment amount (should fail)

4. **Rating Tests:**
   - Test consumer rating retailer
   - Test duplicate rating prevention
   - Test rating by non-owner (should fail)

5. **State Transition Tests:**
   - Test full flow: Wholesaler → Retailer → Consumer
   - Test invalid state transitions
   - Test ownership changes at each step

### Integration Tests (Frontend)

1. **Retailer Workflow:**
   - Propose purchase from wholesaler marketplace
   - View pending proposals
   - Cancel proposal and verify refund
   - Confirm receipt after wholesaler ships
   - List product for sale with markup

2. **Wholesaler Workflow:**
   - View incoming retailer proposals
   - Accept proposal and verify payment received
   - Reject proposal and verify retailer refunded

3. **Consumer Workflow:**
   - Browse retailer marketplace
   - Purchase product and verify ownership
   - Rate retailer after purchase
   - View purchase history with full traceability

4. **End-to-End Flow:**
   - Complete product journey from farmer to consumer
   - Verify all ratings are recorded
   - Verify all payments are transferred correctly

### Manual Testing Checklist

- [ ] Retailer can propose purchase with payment
- [ ] Wholesaler receives proposal notification
- [ ] Wholesaler can accept/reject proposal
- [ ] Payment transfers correctly on acceptance
- [ ] Payment refunds correctly on rejection
- [ ] Retailer can confirm receipt and list for sale
- [ ] Consumer can browse and purchase products
- [ ] Consumer can rate retailer
- [ ] All ratings display correctly in badges
- [ ] Product history shows complete chain
- [ ] Expiry dates display correctly
- [ ] Transaction hashes link to Etherscan

## Security Considerations

1. **Payment Escrow:**
   - Payments held in contract until confirmation
   - Reentrancy protection on payment transfers
   - Refund mechanism for cancelled/rejected proposals

2. **Access Control:**
   - Role-based function restrictions
   - Ownership verification for state changes
   - Proposal target verification

3. **Anti-Spam:**
   - One rating per product per relationship
   - Flags: farmerRated, wholesalerRated, retailerRated
   - Cannot rate same party multiple times

4. **State Machine:**
   - Strict state transition validation
   - Cannot skip states
   - Cannot reverse states

5. **Payment Validation:**
   - Exact payment amount required
   - Payment transfer failure handling
   - Gas optimization for payment operations

## Performance Considerations

1. **Gas Optimization:**
   - Minimize storage writes
   - Use events for historical data
   - Batch operations where possible

2. **Frontend Optimization:**
   - Cache product data in state
   - Debounce proposal fetching
   - Lazy load product history

3. **Scalability:**
   - Pagination for large product lists
   - Filter products by state on frontend
   - Index events for historical queries

## Deployment Strategy

1. **Smart Contract Deployment:**
   - Deploy updated SupplyChain contract
   - Update RoleManager if needed
   - Verify contracts on Etherscan
   - Update config.js with new addresses

2. **Frontend Deployment:**
   - Update ABI files from artifacts
   - Test on local network first
   - Deploy to testnet (Sepolia)
   - Update contract addresses in config

3. **Migration Path:**
   - Existing products remain compatible
   - New fields default to zero address / false
   - No data migration needed

4. **Rollback Plan:**
   - Keep old contract addresses
   - Frontend can switch between versions
   - Document breaking changes
