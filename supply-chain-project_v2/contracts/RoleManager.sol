// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";


contract RoleManager is Ownable(msg.sender) {
    enum Role { None, Farmer, Wholesaler, Retailer, Consumer }
    
    mapping(address => Role) public userRoles;
    mapping(address => string) public usernames;
    mapping(string => address) private usernameToAddress;
    mapping(Role => uint) public roleCounts;
    
    event RoleAssigned(address indexed user, Role role, string username);
    event RoleRevoked(address indexed user, Role oldRole);

    // No constructor needed for Ownable v4+

    modifier validRole(Role role) {
        require(role > Role.None && role <= Role.Consumer, "Invalid role");
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
        emit RoleAssigned(msg.sender, role, username);
    }

    function revokeRole() public {
        Role oldRole = userRoles[msg.sender];
        require(oldRole != Role.None, "Address has no role to revoke");
        userRoles[msg.sender] = Role.None;
        roleCounts[oldRole]--;
        emit RoleRevoked(msg.sender, oldRole);
    }

    function getRole(address user) public view returns (Role) {
        return userRoles[user];
    }

    function getRoleCount(Role role) public view validRole(role) returns (uint) {
        return roleCounts[role];
    }

    function getUsername(address user) public view returns (string memory) {
        return usernames[user];
    }

    /**
     * @dev Resolve an address by username. Returns zero address if not found.
     * Note: username matching is case-sensitive. Frontend should normalize if needed.
     */
    function getAddressByUsername(string memory username) public view returns (address) {
        return usernameToAddress[username];
    }

    // For compatibility with existing config
    function getRoleAsString(address user) public view returns (string memory) {
        Role role = userRoles[user];
        if (role == Role.Farmer) return "Farmer";
        if (role == Role.Wholesaler) return "Wholesaler";
        if (role == Role.Retailer) return "Retailer";
        if (role == Role.Consumer) return "Consumer";
        return "";
    }


}
