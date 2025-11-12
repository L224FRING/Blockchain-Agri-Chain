// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
// IMPORT this library from OpenZeppelin
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract RoleManager is Ownable(msg.sender) {
    // Use EnumerableSet for address sets
    using EnumerableSet for EnumerableSet.AddressSet;

    enum Role { None, Farmer, Wholesaler, Retailer, Consumer }
    
    mapping(address => Role) public userRoles;
    mapping(address => string) public usernames;
    mapping(string => address) private usernameToAddress;
    mapping(Role => uint) public roleCounts;

    // NEW: A mapping from a Role to a set of addresses
    mapping(Role => EnumerableSet.AddressSet) private _roleMembers;
    
    event RoleAssigned(address indexed user, Role role, string username);
    event RoleRevoked(address indexed user, Role oldRole);

    modifier validRole(Role role) {
        require(role > Role.None && role <= Role.Consumer, "Invalid role");
        _;
    }

    struct Rating {
        uint totalScore; // Sum of all 1-5 star ratings
        uint numRatings; // Total number of ratings received
    }

    // 2. Add a mapping from a user's address to their rating
    mapping(address => Rating) public userRatings;

    // 3. Add an address for the SupplyChain contract
    // This is for security, so only your SupplyChain can add ratings
    address public supplyChainContract;

    // 4. Add new events
    event RatingAdded(address indexed user, uint score, uint newAverage);
    event SupplyChainContractSet(address indexed contractAddress);

    // --- NEW MODIFIER ---
    modifier onlySupplyChain() {
        require(msg.sender == supplyChainContract, "Only SupplyChain contract can call this");
        _;
    }

    function registerUser(Role role, string memory username) public validRole(role) {
        require(userRoles[msg.sender] == Role.None, "Address already has a role");
        require(bytes(username).length > 0, "Username cannot be empty");
        require(bytes(username).length <= 32, "Username too long");
        require(usernameToAddress[username] == address(0), "Username already taken");
        
        userRoles[msg.sender] = role;
        usernames[msg.sender] = username;
        usernameToAddress[username] = msg.sender;
        roleCounts[role]++;
        
        // ADDED: Add the user to the role's set
        _roleMembers[role].add(msg.sender);

        emit RoleAssigned(msg.sender, role, username);
    }

    /**
     * @dev Revoke role (UPGRADED VERSION)
     * This version also clears username and removes from the EnumerableSet.
     */
    function revokeRole() public {
        Role oldRole = userRoles[msg.sender];
        require(oldRole != Role.None, "Address has no role to revoke");

        string memory oldUsername = usernames[msg.sender];

        // Clear all state
        userRoles[msg.sender] = Role.None;
        roleCounts[oldRole]--;
        delete usernames[msg.sender];
        delete usernameToAddress[oldUsername];
        
        // ADDED: Remove the user from the role's set
        _roleMembers[oldRole].remove(msg.sender);

        emit RoleRevoked(msg.sender, oldRole);
    }

    // --- NEW GETTER FUNCTION ---
    /**
     * @dev Gets all usernames for a given role.
     * This is the function your frontend will call.
     */
    function getUsernamesByRole(Role role) public view validRole(role) returns (string[] memory) {
        // Get all addresses for the role
        address[] memory members = _roleMembers[role].values();
        
        // Create a new string array to hold the usernames
        string[] memory roleUsernames = new string[](members.length);

        // Loop through the addresses and get the username for each
        for (uint i = 0; i < members.length; i++) {
            roleUsernames[i] = usernames[members[i]];
        }

        return roleUsernames;
    }
    
    // --- Your existing functions (no changes needed) ---

    function getRole(address user) public view returns (Role) {
        return userRoles[user];
    }

    function getRoleCount(Role role) public view validRole(role) returns (uint) {
        return roleCounts[role];
    }

    function getUsername(address user) public view returns (string memory) {
        return usernames[user];
    }

    function getAddressByUsername(string memory username) public view returns (address) {
        return usernameToAddress[username];
    }

    function getRoleAsString(address user) public view returns (string memory) {
        Role role = userRoles[user];
        if (role == Role.Farmer) return "Farmer";
        if (role == Role.Wholesaler) return "Wholesaler";
        if (role == Role.Retailer) return "Retailer";
        if (role == Role.Consumer) return "Consumer";
        return "";
    }


    function setSupplyChainContract(address _contractAddress) public onlyOwner {
        require(_contractAddress != address(0), "Invalid address");
        supplyChainContract = _contractAddress;
        emit SupplyChainContractSet(_contractAddress);
    }

    /**
     * @dev Adds a rating to a user. Called *only* by the SupplyChain contract.
     * @param userToRate The address of the user being rated (e.g., Farmer).
     * @param score The rating from 1 to 5.
     */
    function addRating(address userToRate, uint score) external onlySupplyChain {
        require(score >= 1 && score <= 5, "Rating must be between 1 and 5");

        Rating storage r = userRatings[userToRate];
        r.totalScore += score;
        r.numRatings++;

        uint newAverage = r.totalScore / r.numRatings;
        emit RatingAdded(userToRate, score, newAverage);
    }

    /**
     * @dev Public view function to get any user's average rating.
     * Returns average (1-5) and total number of ratings.
     */
    function getAverageRating(address user) public view returns (uint average, uint numRatings) {
        Rating memory r = userRatings[user];
        if (r.numRatings == 0) {
            return (0, 0);
        }
        // Returns the average (integer division is fine for 1-5 stars)
        return (r.totalScore / r.numRatings, r.numRatings);
    }
}
