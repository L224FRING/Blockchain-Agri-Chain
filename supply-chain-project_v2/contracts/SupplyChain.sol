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
        string transactionHash; // Hash of the initial addProduct transaction
        uint quantity;          // Amount of the product
        string unit;            // e.g., "kg", "crates", "liters"
        uint pricePerUnit;      // Price in smallest unit (e.g., Wei for ETH, or cents)
        State currentState;     // Current stage in the supply chain
        uint expiryDate;        // Unix timestamp for product expiry
        uint creationTimestamp; // Timestamp of creation
        uint lastUpdateTimestamp; // Timestamp of last update
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

    // One active proposal per product
    mapping(uint => TransferProposal) public transferProposals;

    // Events for the proposal lifecycle
    event TransferProposed(uint indexed productId, address indexed from, string toUsername, address toAddress);
    event TransferConfirmed(uint indexed productId, address indexed by, string role);
    event TransferExecuted(uint indexed productId, address indexed from, address indexed to);

    // --- Events ---
    // Emitted when a product is first added
    event ProductAdded(
        uint indexed id,
        string name,
        address indexed owner, // Farmer address
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
            transactionHash: "", // Initial hash is empty
            quantity: _quantity,
            unit: _unit,
            pricePerUnit: _pricePerUnit,
            currentState: State.Harvested, // Initial state
            expiryDate: _expiryDate,
            creationTimestamp: block.timestamp,
            lastUpdateTimestamp: block.timestamp
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


        emit ProductAdded(newId, _name, msg.sender, _quantity, _unit, _pricePerUnit, State.Harvested);
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

}


