import React, { useState } from 'react';
import { ethers } from 'ethers';
import { ROLE_MANAGER_ADDRESS, ROLE_MANAGER_ABI } from '../config';
import './Auth.css';

const ROLES = {
    FARMER: 1,
    WHOLESALER: 2,
    RETAILER: 3,
    CONSUMER: 4
};

const Auth = ({ onLogin }) => {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');
    const [username, setUsername] = useState('');

    const connectWallet = async () => {
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            if (!window.ethereum) {
                throw new Error('Please install MetaMask to use this application');
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            
            // Request account access
            const accounts = await provider.send("eth_requestAccounts", []);
            const address = accounts[0];
            
            // Check if the network is Sepolia
            const network = await provider.getNetwork();
            if (network.chainId !== 11155111n) {
                throw new Error('Please connect to Sepolia network');
            }

            // Get the role manager contract
            const roleManager = new ethers.Contract(ROLE_MANAGER_ADDRESS, ROLE_MANAGER_ABI, provider);
            const roleString = await roleManager.getRoleAsString(address);
            const username = await roleManager.getUsername(address);
            
            if (roleString) {
                // User already has a role, log them in
                onLogin(roleString, address, username);
            } else {
                // User needs to register
                setSuccess('Wallet connected! Please enter your username and select a role to register.');
            }

        } catch (err) {
            setError(err.message || 'Failed to connect wallet');
            console.error('Auth Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const registerRole = async () => {
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            if (!selectedRole) {
                throw new Error('Please select a role');
            }
            
            if (!username.trim()) {
                throw new Error('Please enter a username');
            }
            
            if (username.length > 32) {
                throw new Error('Username is too long (maximum 32 characters)');
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const roleManager = new ethers.Contract(ROLE_MANAGER_ADDRESS, ROLE_MANAGER_ABI, signer);

            // Convert role string to enum value
            const roleValue = ROLES[selectedRole.toUpperCase()];
            if (!roleValue) {
                throw new Error('Invalid role selected');
            }

            // Register the role with username
            const tx = await roleManager.registerUser(roleValue, username.trim());
            setSuccess('Registration submitted. Please wait for confirmation...');
            
            // Wait for the transaction to be mined
            await tx.wait();
            
            // Get the updated role and username
            const address = await signer.getAddress();
            const roleString = await roleManager.getRoleAsString(address);
            const registeredUsername = await roleManager.getUsername(address);
            
            // Login with the new role and username
            onLogin(roleString, address, registeredUsername);

        } catch (err) {
            setError(err.message || 'Failed to register role');
            console.error('Registration Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h1>AgriChain Authentication</h1>
            <p    >Connect your wallet and register your role in the supply chain system</p>
            
            <button 
                onClick={connectWallet} 
                disabled={isLoading}
                className="connect-button"
            >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>

            {success && (
                <div className="success-message">
                    {success}
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Role selection appears after wallet connection */}
            {success && !error && (
                <div className="role-selection">
                    <h3>Enter Your Details:</h3>
                    <input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="username-input"
                        maxLength={32}
                        disabled={isLoading}
                    />
                    <h3>Select Your Role:</h3>
                    <select 
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="role-select"
                        disabled={isLoading}
                    >
                        <option value="">Choose a role...</option>
                        <option value="Farmer">Farmer</option>
                        <option value="Wholesaler">Wholesaler</option>
                        <option value="Retailer">Retailer</option>
                        <option value="Consumer">Consumer</option>
                    </select>
                    
                    <button 
                        onClick={registerRole}
                        disabled={isLoading || !selectedRole}
                        className="register-button"
                    >
                        {isLoading ? 'Registering...' : 'Register Role'}
                    </button>
                </div>
            )}

            <div className="auth-info">
                <h3>Important Notes:</h3>
                <ul>
                    <li>Make sure you're connected to Sepolia testnet</li>
                    <li>You can only register one role per wallet address</li>
                    <li>Role registration is permanent (but can be revoked)</li>
                    <li>You'll need some Sepolia ETH for registration</li>
                </ul>
            </div>
        </div>
    );
};

export default Auth;
