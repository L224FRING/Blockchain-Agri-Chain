// contracts/SupplyChain.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import console.log for debugging during development (optional)
// You might need to run `npm install --save-dev hardhat-deploy hardhat-deploy-ethers @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers`
// if you haven't used console.log before with hardhat
import "hardhat/console.sol";

// Minimal interface for RoleManager to resolve usernames and roles
interface IRoleManager {
    function getAddressByUsername(string memory username) external view returns (address);
    function getRoleAsString(address user) external view returns (string memory);
    function addRating(address userToRate, uint score) external;
}

contract SupplyChain {

    // Define the possible states a product can be in
    enum State {
        Harvested,          // 0: Initial state when added by Farmer
        ShippedToWholesaler,// 1
        ReceivedByWholesaler,// 2
        Processed,          // 3: Optional state if Wholesaler processes
        ShippedToRetailer,  // 4
        ReceivedByRetailer, // 5
        ForSale,            // 6: Listed by Retailer
        SoldToConsumer      // 7
    }

    // Structure to hold all product details
    struct Product {
        uint id;                // Unique identifier
        string name;            // e.g., "Organic Apples"
        string origin;          // e.g., "Nashik Farm"
        address owner;          // Current owner's wallet address
        address farmer;         // Original creator
        address wholesaler;     // Wholesaler who handled the product
        address retailer;       // Retailer who sold the product
        string transactionHash; // Hash of the initial addProduct transaction
        uint quantity;          // Amount of the product
        string unit;            // e.g., "kg", "crates", "liters"
        uint pricePerUnit;      // Price in smallest unit (e.g., Wei for ETH, or cents)
        State currentState;     // Current stage in the supply chain
        uint expiryDate;        // Unix timestamp for product expiry
        uint creationTimestamp; // Timestamp of creation
        uint lastUpdateTimestamp; // Timestamp of last update
        bool farmerRated;       // Anti-spam flag for farmer rating
        bool wholesalerRated;   // Anti-spam flag for wholesaler rating
        bool retailerRated;     // Anti-spam flag for retailer rating
    }

    // Mapping from product ID to Product struct
    mapping(uint => Product) public products;
    // Counter for product IDs, starting from 1
    uint public productCount;

    // Role manager reference for resolving usernames -> addresses
    IRoleManager public roleManager;

    // Transfer proposal struct: a farmer proposes transfer to a wholesaler identified by username.
    struct TransferProposal {
        uint productId;
        address proposer; // farmer
        address target; // resolved wholesaler address
        string targetUsername; // wholesaler username used for lookup
        bool farmerConfirmed;
        bool wholesalerConfirmed;
        bool executed;
    }

    // Retailer transfer proposal struct: a retailer proposes purchase from a wholesaler with payment escrow
    struct RetailerTransferProposal {
        uint productId;
        address proposer;        // retailer address
        address target;          // wholesaler address
        uint proposedPrice;      // price retailer will pay
        bool retailerConfirmed;  // always true when created
        bool wholesalerConfirmed;
        bool executed;
    }

    // One active proposal per product
    mapping(uint => TransferProposal) public transferProposals;
    
    // Retailer proposals (separate mapping)
    mapping(uint => RetailerTransferProposal) public retailerTransferProposals;
    
    // Track escrowed payments for retailer proposals
    mapping(uint => uint) public escrowedPayments;

    // Events for the proposal lifecycle
    event TransferProposed(uint indexed productId, address indexed from, string toUsername, address toAddress);
    event TransferConfirmed(uint indexed productId, address indexed by, string role);
    event TransferExecuted(uint indexed productId, address indexed from, address indexed to);
    
    // Events for retailer proposal lifecycle
    event RetailerPurchaseProposed(uint indexed productId, address indexed retailer, address indexed wholesaler, uint price);
    event RetailerPurchaseConfirmed(uint indexed productId, address indexed wholesaler, address indexed retailer);
    event RetailerProposalRejected(uint indexed productId, address indexed wholesaler, address indexed retailer);
    event RetailerProposalCancelled(uint indexed productId, address indexed retailer);
    event ProductListedForSale(uint indexed productId, uint oldPrice, uint newPrice, address indexed retailer);
    event ConsumerPurchase(uint indexed productId, address indexed consumer, address indexed retailer, uint price);

    // --- Events ---
    // Emitted when a product is first added
    event ProductAdded(
        uint indexed id,
        string name,
        address indexed owner, // Farmer address
        address indexed farmer,
        uint quantity,
        string unit,
        uint pricePerUnit,
        State initialState
    );
    // Emitted when the initial transaction hash is saved
    event HashUpdated(uint indexed id, string txHash);
    // Emitted when the product's state changes
    event ProductStateUpdated(uint indexed id, State oldState, State newState, address indexed stakeholder);
    // Emitted when ownership changes hands
    event OwnershipTransferred(uint indexed id, address indexed from, address indexed to);
    // Add this new event near your other events
    event PriceUpdated(uint indexed id, uint oldPrice, uint newPrice, address indexed by);
    event ProductRated(uint indexed productId, address indexed ratedBy, address indexed userRated, uint score);

    // --- Modifiers (for access control) ---
    // Ensures only the current owner of a product can call a function
    modifier onlyOwner(uint _id) {
        require(products[_id].owner == msg.sender, "Only the current owner can perform this action");
        _;
    }
    // Ensures a product ID exists
    modifier productExists(uint _id) {
        require(_id > 0 && _id <= productCount, "Product does not exist");
        require(products[_id].id != 0, "Product data missing"); // Extra check
        _;
    }

    // --- Functions ---

    // Set the RoleManager address at deployment
    constructor(address _roleManager) {
        require(_roleManager != address(0), "RoleManager address required");
        roleManager = IRoleManager(_roleManager);
    }

    /**
     * @dev Adds a new product (called by Farmer).
     * Initializes state to Harvested.
     * Returns the ID of the newly created product.
     */
    function addProduct(
        string memory _name,
        string memory _origin,
        uint _quantity,
        string memory _unit,
        uint _pricePerUnit,
        uint _expiryDate
    ) public returns (uint) {
        require(_quantity > 0, "Quantity must be greater than zero");
        require(_pricePerUnit > 0, "Price must be greater than zero"); // Or allow free items?
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_origin).length > 0, "Origin cannot be empty");
        require(bytes(_unit).length > 0, "Unit cannot be empty");
        require(_expiryDate > block.timestamp, "Expiry date must be in the future");

        productCount++;
        uint newId = productCount;

        products[newId] = Product({
            id: newId,
            name: _name,
            origin: _origin,
            owner: msg.sender, // Owner is the Farmer calling this
            farmer: msg.sender,
            wholesaler: address(0),
            retailer: address(0),
            transactionHash: "", // Initial hash is empty
            quantity: _quantity,
            unit: _unit,
            pricePerUnit: _pricePerUnit,
            currentState: State.Harvested, // Initial state
            expiryDate: _expiryDate,
            creationTimestamp: block.timestamp,
            lastUpdateTimestamp: block.timestamp,
            farmerRated: false,
            wholesalerRated: false,
            retailerRated: false
        });

        // UPDATED console.log
        console.log("--- Product Added ---");
        console.log("ID:", newId);
        console.log("Name:", _name);
        console.log("Owner:", msg.sender);
        console.log("Quantity:", _quantity);
        console.log("Unit:", _unit);
        console.log("Price/Unit:", _pricePerUnit);
        console.log("---------------------");


        emit ProductAdded(newId, _name, msg.sender, msg.sender, _quantity, _unit, _pricePerUnit, State.Harvested);
        return newId; // Return the ID so frontend knows which product to update hash for
    }

    /**
     * @dev Farmer proposes transfer of their product to a wholesaler (by username).
     * Farmer must be the current owner. Wholesaler must exist and be of role Wholesaler.
     * Both farmer and wholesaler must confirm before the transfer is executed.
     */
    function proposeTransferToWholesaler(uint _id, string memory wholesalerUsername) public onlyOwner(_id) productExists(_id) {
        require(bytes(wholesalerUsername).length > 0, "Wholesaler username required");
        require(products[_id].currentState == State.Harvested || products[_id].currentState == State.ReceivedByWholesaler || products[_id].currentState == State.Processed, "Product not in transferrable state");
        TransferProposal storage p = transferProposals[_id];
        require(!p.executed, "Existing proposal already executed");
        require(p.proposer == address(0) || (p.proposer != address(0) && !p.farmerConfirmed && !p.wholesalerConfirmed), "Active proposal exists");

        address target = roleManager.getAddressByUsername(wholesalerUsername);
        require(target != address(0), "Wholesaler username not found");
        string memory roleStr = roleManager.getRoleAsString(target);
        require(keccak256(bytes(roleStr)) == keccak256(bytes("Wholesaler")), "Target must be a Wholesaler");

        // Create proposal; farmer implicitly confirms by proposing
        transferProposals[_id] = TransferProposal({
            productId: _id,
            proposer: msg.sender,
            target: target,
            targetUsername: wholesalerUsername,
            farmerConfirmed: true,
            wholesalerConfirmed: false,
            executed: false
        });

        emit TransferProposed(_id, msg.sender, wholesalerUsername, target);
        emit TransferConfirmed(_id, msg.sender, "Farmer");
    }

    /**
     * @dev Called by the targeted wholesaler to confirm the proposed transfer.
     * Once both farmer and wholesaler have confirmed, the transfer is executed.
     */
    function wholesalerConfirmTransfer(uint _id) public productExists(_id) {
        TransferProposal storage p = transferProposals[_id];
        require(p.proposer != address(0), "No active proposal");
        require(!p.executed, "Proposal already executed");
        require(p.target == msg.sender, "Only the targeted wholesaler can confirm");

        p.wholesalerConfirmed = true;
        emit TransferConfirmed(_id, msg.sender, "Wholesaler");

        // If both confirmed execute
        if (p.farmerConfirmed && p.wholesalerConfirmed) {
            _executeTransfer(_id);
        }
    }

    function _executeTransfer(uint _id) internal {
        TransferProposal storage p = transferProposals[_id];
        require(p.proposer != address(0), "No active proposal");
        require(p.farmerConfirmed && p.wholesalerConfirmed, "Both parties must confirm");
        require(!p.executed, "Already executed");

        address oldOwner = products[_id].owner;
        address newOwner = p.target;


        products[_id].owner = newOwner;
        products[_id].wholesaler = newOwner;
        products[_id].currentState = State.ShippedToWholesaler;
        products[_id].lastUpdateTimestamp = block.timestamp;

        p.executed = true;

        emit TransferExecuted(_id, oldOwner, newOwner);
        emit OwnershipTransferred(_id, oldOwner, newOwner);

        // keep proposal record (executed = true) for auditing; frontend can clear it if desired
    }

    /**
     * @dev Updates the initial transaction hash for a product.
     * Should only be called once, ideally right after addProduct confirmation.
     * Restricted to the owner.
     * NOTE: This function is now DEPRECATED as the hash is handled off-chain by the frontend.
     */
    function updateProductHash(uint _id) public payable onlyOwner(_id) productExists(_id) {
        revert("updateProductHash is deprecated; hash retrieved off-chain.");
    }


     /**
     * @dev Updates the state of a product.
     * Restricted to the current owner.
     * Includes basic state transition validation.
     */
    function updateProductState(uint _id, State _newState) public onlyOwner(_id) productExists(_id) {
        State oldState = products[_id].currentState;
        require(_newState != oldState, "New state must be different from current state");

        // --- State Transition Logic ---
        // Farmer Actions
        if (/* msg.sender == products[_id].owner && */ oldState == State.Harvested) { // onlyOwner modifier already checks owner
             require(_newState == State.ShippedToWholesaler, "Farmer can only ship harvested products to wholesaler");
        }
        // Wholesaler Actions
        else if (/* msg.sender == products[_id].owner && */ oldState == State.ShippedToWholesaler) {
             require(_newState == State.ReceivedByWholesaler, "Wholesaler can only receive products shipped to them");
        }
        else if (/* msg.sender == products[_id].owner && */ oldState == State.ReceivedByWholesaler) {
             require(_newState == State.Processed || _newState == State.ShippedToRetailer, "Wholesaler can process or ship received products");
        }
         else if (/* msg.sender == products[_id].owner && */ oldState == State.Processed) {
             require(_newState == State.ShippedToRetailer, "Wholesaler can only ship processed products to retailer");
        }
        // Retailer Actions
         else if (/* msg.sender == products[_id].owner && */ oldState == State.ShippedToRetailer) {
             require(_newState == State.ReceivedByRetailer, "Retailer can only receive products shipped to them");
        }
         else if (/* msg.sender == products[_id].owner && */ oldState == State.ReceivedByRetailer) {
             // Note: Retailer should use retailerListForSale function instead of direct state update
             require(_newState == State.ForSale, "Retailer can list received products for sale");
        }
         else if (/* msg.sender == products[_id].owner && */ oldState == State.ForSale) {
             // A 'buy' function would handle SoldToConsumer, not just a state update
             require(_newState == State.SoldToConsumer, "State change to SoldToConsumer requires separate buy function"); // Clarified revert message
        }
        // Add more specific role checks if implementing role-based access control
        else {
            revert("Invalid state transition for this owner/state");
        }


        products[_id].currentState = _newState;
        // products[_id].lastUpdateTimestamp = block.timestamp; // Update timestamp if added

        // UPDATED console.log
        console.log("--- State Updated ---");
        console.log("Product ID:", _id);
        // Logging enums directly might just show the integer, cast to uint for clarity
        console.log("Old State (uint):", uint(oldState));
        console.log("New State (uint):", uint(_newState));
        console.log("Updated By:", msg.sender);
        console.log("---------------------");

        emit ProductStateUpdated(_id, oldState, _newState, msg.sender);
    }

    /**
     * @dev Transfers ownership of a product to a new address.
     * Restricted to the current owner. Should often accompany a state change.
     */
    function transferOwnership(uint _id, address _newOwner) public onlyOwner(_id) productExists(_id) {
        require(_newOwner != address(0), "Cannot transfer to the zero address");
        require(_newOwner != msg.sender, "New owner must be different from the current owner");

        address oldOwner = products[_id].owner;
        products[_id].owner = _newOwner;
        // products[_id].lastUpdateTimestamp = block.timestamp; // Update timestamp if added

        // UPDATED console.log
        console.log("--- Ownership Transferred ---");
        console.log("Product ID:", _id);
        console.log("From:", oldOwner);
        console.log("To:", _newOwner);
        console.log("---------------------------");

        emit OwnershipTransferred(_id, oldOwner, _newOwner);
    }


    /**
     * @dev Fetches all products. Returns array of Product structs.
     */
    function getAllProducts() public view returns (Product[] memory) {
        // Create an array in memory with size equal to the number of products added
        // Note: This can become gas-intensive if productCount is very large.
        // Consider pagination or indexed events for large datasets in production.
        Product[] memory allProducts = new Product[](productCount);
        uint count = 0; // Keep track of actual products added to the array
        for (uint i = 1; i <= productCount; i++) {
            // Check if product exists (id is not 0, defensive check)
            if (products[i].id != 0) {
                 allProducts[count] = products[i];
                 count++;
            }
        }
         // If some products were somehow skipped (shouldn't happen with current logic),
         // we might return an array with empty slots at the end.
         // A more robust way might be to create a dynamic array or filter empty slots,
         // but for simplicity, this works if productCount is accurate.

         // Let's refine this to return an array of the exact size needed
         Product[] memory exactSizeProducts = new Product[](count);
         for(uint j = 0; j < count; j++) {
             exactSizeProducts[j] = allProducts[j];
         }
        // return allProducts; // Return original potentially oversized array
        return exactSizeProducts; // Return correctly sized array
    }

     /**
      * @dev Fetches a single product by its ID.
      * Throws error if product doesn't exist.
      */
     function getProductById(uint _id) public view productExists(_id) returns (Product memory) {
         return products[_id];
     }

     /**
     * @dev Allows a wholesaler (as owner) to set a new price based on a markup.
     * Can only be called when the product is in their possession.
     */
    function wholesalerSetPrice(uint _id, uint _markupPercentage) public onlyOwner(_id) productExists(_id) {
        Product storage p = products[_id];
        
        // Require product is in a state where wholesaler can set price
        require(
            p.currentState == State.ReceivedByWholesaler || p.currentState == State.Processed,
            "Product must be received or processed by wholesaler"
        );
        
        require(_markupPercentage > 0, "Markup must be positive");

        uint oldPrice = p.pricePerUnit;
        
        // Calculate markup amount (e.g., 100 * 20 / 100 = 20)
        uint markupAmount = (oldPrice * _markupPercentage) / 100;
        
        // Calculate and set new price
        uint newPrice = oldPrice + markupAmount;
        p.pricePerUnit = newPrice;
        
        p.lastUpdateTimestamp = block.timestamp;

        emit PriceUpdated(_id, oldPrice, newPrice, msg.sender);
    }

    /**
     * @dev Allows a retailer to list product for sale to consumers with markup.
     * Updates state to ForSale and sets new price.
     */
    function retailerListForSale(uint _id, uint _markupPercentage) public onlyOwner(_id) productExists(_id) {
        Product storage p = products[_id];
        
        // 1. Validate product state is ReceivedByRetailer
        require(p.currentState == State.ReceivedByRetailer, "Product must be received by retailer");
        
        // 2. Validate markup is positive
        require(_markupPercentage > 0, "Markup must be positive");

        // 3. Calculate new price with markup
        uint oldPrice = p.pricePerUnit;
        uint markupAmount = (oldPrice * _markupPercentage) / 100;
        uint newPrice = oldPrice + markupAmount;
        
        // 4. Update price and state
        p.pricePerUnit = newPrice;
        p.currentState = State.ForSale;
        p.lastUpdateTimestamp = block.timestamp;

        // 5. Emit events
        emit ProductListedForSale(_id, oldPrice, newPrice, msg.sender);
        emit ProductStateUpdated(_id, State.ReceivedByRetailer, State.ForSale, msg.sender);
    }

    /**
     * @dev Allows a Retailer to propose purchase from a wholesaler with payment escrow.
     * Payment is held in contract until wholesaler confirms.
     */
    function proposeRetailerPurchase(uint _id) public payable productExists(_id) {
        // 1. Check role of buyer (must be a Retailer)
        string memory roleStr = roleManager.getRoleAsString(msg.sender);
        require(keccak256(bytes(roleStr)) == keccak256(bytes("Retailer")), "Caller must be a Retailer");

        Product storage p = products[_id];

        // 2. Check product is in a buyable state from wholesaler
        require(
            p.currentState == State.ReceivedByWholesaler || p.currentState == State.Processed,
            "Product not for sale by wholesaler"
        );
        
        // 3. Check payment is correct
        uint price = p.pricePerUnit;
        require(msg.value == price, "Incorrect payment amount sent");

        // 4. Check no active proposal exists
        RetailerTransferProposal storage proposal = retailerTransferProposals[_id];
        require(proposal.proposer == address(0) || proposal.executed, "Active proposal already exists");

        // 5. Create proposal with retailer confirmed
        address wholesaler = p.owner;
        retailerTransferProposals[_id] = RetailerTransferProposal({
            productId: _id,
            proposer: msg.sender,
            target: wholesaler,
            proposedPrice: price,
            retailerConfirmed: true,
            wholesalerConfirmed: false,
            executed: false
        });

        // 6. Store payment in escrow
        escrowedPayments[_id] = msg.value;

        // 7. Emit event
        emit RetailerPurchaseProposed(_id, msg.sender, wholesaler, price);
    }

    /**
     * @dev Allows a Retailer to cancel their purchase proposal and get refund.
     * Can only cancel if wholesaler hasn't confirmed yet.
     */
    function cancelRetailerProposal(uint _id) public productExists(_id) {
        RetailerTransferProposal storage proposal = retailerTransferProposals[_id];
        
        // 1. Validate caller is the proposer
        require(proposal.proposer == msg.sender, "Only proposer can cancel");
        
        // 2. Validate proposal exists and not executed
        require(proposal.proposer != address(0), "No active proposal");
        require(!proposal.executed, "Proposal already executed");
        
        // 3. Validate wholesaler has not confirmed
        require(!proposal.wholesalerConfirmed, "Cannot cancel after wholesaler confirmation");

        // 4. Get escrowed payment amount
        uint refundAmount = escrowedPayments[_id];
        require(refundAmount > 0, "No escrowed payment found");

        // 5. Clear proposal and escrow
        delete retailerTransferProposals[_id];
        delete escrowedPayments[_id];

        // 6. Refund payment to retailer
        (bool sent, ) = msg.sender.call{value: refundAmount}("");
        require(sent, "Failed to refund payment");

        // 7. Emit event
        emit RetailerProposalCancelled(_id, msg.sender);
    }

    /**
     * @dev Allows wholesaler to confirm retailer purchase proposal.
     * Transfers escrowed payment to wholesaler and ownership to retailer.
     */
    function wholesalerConfirmRetailerPurchase(uint _id) public productExists(_id) {
        RetailerTransferProposal storage proposal = retailerTransferProposals[_id];
        Product storage p = products[_id];
        
        // 1. Validate proposal exists and not executed
        require(proposal.proposer != address(0), "No active proposal");
        require(!proposal.executed, "Proposal already executed");
        
        // 2. Validate caller is the target wholesaler (current owner)
        require(proposal.target == msg.sender, "Only target wholesaler can confirm");
        require(p.owner == msg.sender, "Only current owner can confirm");

        // 3. Set wholesaler confirmed
        proposal.wholesalerConfirmed = true;

        // 4. Get escrowed payment
        uint payment = escrowedPayments[_id];
        require(payment > 0, "No escrowed payment found");

        // 5. Transfer payment to wholesaler
        address wholesaler = msg.sender;
        (bool sent, ) = wholesaler.call{value: payment}("");
        require(sent, "Failed to send payment to wholesaler");

        // 6. Transfer ownership to retailer
        address retailer = proposal.proposer;
        p.owner = retailer;
        p.retailer = retailer;

        // 7. Update product state to ShippedToRetailer
        State oldState = p.currentState;
        p.currentState = State.ShippedToRetailer;
        p.lastUpdateTimestamp = block.timestamp;

        // 8. Mark proposal as executed and clear escrow
        proposal.executed = true;
        delete escrowedPayments[_id];

        // 9. Emit events
        emit RetailerPurchaseConfirmed(_id, wholesaler, retailer);
        emit OwnershipTransferred(_id, wholesaler, retailer);
        emit ProductStateUpdated(_id, oldState, State.ShippedToRetailer, msg.sender);
    }

    /**
     * @dev Allows wholesaler to reject retailer purchase proposal.
     * Refunds escrowed payment to retailer.
     */
    function wholesalerRejectRetailerPurchase(uint _id) public productExists(_id) {
        RetailerTransferProposal storage proposal = retailerTransferProposals[_id];
        
        // 1. Validate proposal exists and not executed
        require(proposal.proposer != address(0), "No active proposal");
        require(!proposal.executed, "Proposal already executed");
        
        // 2. Validate caller is the target wholesaler
        require(proposal.target == msg.sender, "Only target wholesaler can reject");

        // 3. Get escrowed payment amount
        uint refundAmount = escrowedPayments[_id];
        require(refundAmount > 0, "No escrowed payment found");

        // 4. Store retailer address before clearing
        address retailer = proposal.proposer;

        // 5. Clear proposal and escrow
        delete retailerTransferProposals[_id];
        delete escrowedPayments[_id];

        // 6. Refund payment to retailer
        (bool sent, ) = retailer.call{value: refundAmount}("");
        require(sent, "Failed to refund payment");

        // 7. Emit event
        emit RetailerProposalRejected(_id, msg.sender, retailer);
    }


    // --- 5. ADD NEW RATING FUNCTIONS ---

    /**
     * @dev Allows Wholesaler (owner) to rate the Farmer for a product.
     * Can only be called after receiving the product.
     */
    function wholesalerRateFarmer(uint _id, uint score) public productExists(_id) {
        Product storage p = products[_id];
        
        // 1. Check permissions
        require(p.owner == msg.sender, "Only the current owner (Wholesaler) can rate");
        require(p.currentState == State.ReceivedByWholesaler || p.currentState == State.Processed, "Can only rate after receiving product");
        
        // 2. Check anti-spam flag
        require(!p.farmerRated, "Farmer has already been rated for this product");

        // 3. Set flag
        p.farmerRated = true;

        // 4. Call RoleManager to add the rating to the FARMER
        roleManager.addRating(p.farmer, score);

        // 5. Emit event
        emit ProductRated(_id, msg.sender, p.farmer, score);
    }

    /**
     * @dev Allows Retailer (owner) to rate the Wholesaler for a product.
     * Can only be called after receiving the product.
     */
    function retailerRateWholesaler(uint _id, uint score) public productExists(_id) {
        Product storage p = products[_id];
        
        // 1. Check permissions
        require(p.owner == msg.sender, "Only the current owner (Retailer) can rate");
        require(p.currentState == State.ReceivedByRetailer || p.currentState == State.ForSale, "Can only rate after receiving product");
        require(p.wholesaler != address(0), "No wholesaler to rate for this product");

        // 2. Check anti-spam flag
        require(!p.wholesalerRated, "Wholesaler has already been rated for this product");
        
        // 3. Set flag
        p.wholesalerRated = true;

        // 4. Call RoleManager to add the rating to the WHOLESALER
        roleManager.addRating(p.wholesaler, score);

        // 5. Emit event
        emit ProductRated(_id, msg.sender, p.wholesaler, score);
    }

    /**
     * @dev Allows a Consumer to buy a product from a retailer.
     * Product must be in ForSale state.
     */
    function consumerBuyFromRetailer(uint _id) public payable productExists(_id) {
        // 1. Check role of buyer (must be a Consumer)
        string memory roleStr = roleManager.getRoleAsString(msg.sender);
        require(keccak256(bytes(roleStr)) == keccak256(bytes("Consumer")), "Caller must be a Consumer");

        Product storage p = products[_id];

        // 2. Check product is in ForSale state
        require(p.currentState == State.ForSale, "Product not for sale");
        
        // 3. Check payment is correct
        uint price = p.pricePerUnit;
        require(msg.value == price, "Incorrect payment amount sent");

        // 4. Transfer payment to current owner (retailer)
        address retailer = p.owner;
        (bool sent, ) = retailer.call{value: msg.value}("");
        require(sent, "Failed to send payment to retailer");

        // 5. Update product state and ownership
        State oldState = p.currentState;
        p.owner = msg.sender; // New owner is the Consumer
        p.currentState = State.SoldToConsumer;
        p.lastUpdateTimestamp = block.timestamp;

        // 6. Emit events
        emit ConsumerPurchase(_id, msg.sender, retailer, price);
        emit OwnershipTransferred(_id, retailer, msg.sender);
        emit ProductStateUpdated(_id, oldState, State.SoldToConsumer, msg.sender);
    }

    /**
     * @dev Allows a Consumer to rate the Retailer for a product.
     * Can only be called after purchasing the product.
     */
    function consumerRateRetailer(uint _id, uint score) public productExists(_id) {
        Product storage p = products[_id];
        
        // 1. Check permissions
        require(p.owner == msg.sender, "Only the current owner (Consumer) can rate");
        require(p.currentState == State.SoldToConsumer, "Can only rate after purchase");
        require(p.retailer != address(0), "No retailer to rate for this product");

        // 2. Validate score
        require(score >= 1 && score <= 5, "Rating must be between 1 and 5");

        // 3. Check anti-spam flag
        require(!p.retailerRated, "Retailer has already been rated for this product");
        
        // 4. Set flag
        p.retailerRated = true;

        // 5. Call RoleManager to add the rating to the RETAILER
        roleManager.addRating(p.retailer, score);

        // 6. Emit event
        emit ProductRated(_id, msg.sender, p.retailer, score);
    }

}


