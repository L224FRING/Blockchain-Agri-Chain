import React from 'react';
import { ethers } from 'ethers';
// Import the necessary mappings from the config file
import { STATE_MAPPING } from './config'; 
import './App.css'; // For general styling

// This is the Sepolia Etherscan URL for linking the hash
const ETHERSCAN_URL = "https://sepolia.etherscan.io/tx/";

// Utility function to format price
const formatPrice = (price) => {
    // Assuming price is stored as a whole number (no decimals in contract)
    const PRICE_DECIMALS = 0; 
    
    // Check if price is a BigInt (modern ethers.js return type)
    if (typeof price === 'bigint') {
        // Safely convert BigInt to string before passing to formatUnits
        try {
            const formatted = ethers.formatUnits(price, PRICE_DECIMALS);
            // Use local string formatting for currency display
            return `₹${Number(formatted).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
        } catch (e) {
            console.error("Error formatting price (BigInt issue):", e);
            return "N/A (Fmt Error)";
        }
    }
    // Handle cases where the value might be null or zero
    return "N/A";
};

// Component to handle action buttons (Phase 2 core logic)
// Added onAction prop
const ProductActions = ({ product, currentRole, connectedWallet, onAction, loading }) => {
    // Current owner should be the connected wallet
    const isOwner = product.owner.toLowerCase() === connectedWallet.toLowerCase();
    
    // --- Farmer Actions ---
    if (currentRole === 'Farmer' && isOwner) {
        if (product.currentState === 0) { // State 0: Harvested
            return (
                <button 
                    onClick={() => onAction(product.id)} // Calls the shipToWholesaler function
                    className="button-action button-ship"
                    disabled={loading}
                >
                    Ship to Wholesaler
                </button>
            );
        }
    }
    
    // --- Wholesaler Actions ---
     if (currentRole === 'Wholesaler' && isOwner) {
        if (product.currentState === 1) { // State 1: Shipped To Wholesaler
            return (
                <button 
                    onClick={() => onAction(product.id)} // Calls the confirmReceipt function
                    className="button-action button-receive"
                    disabled={loading}
                >
                    Confirm Receipt
                </button>
            );
        }
    }
    
    // If no action is available or required
    if (currentRole === 'Consumer') {
         return <span className="no-action-label">View History</span>;
    }

    // Return current state label if no actions are available but the product is still owned
    if (isOwner) {
         return <span className="no-action-label">Status OK</span>;
    }

    return <span className="no-action-label">No actions available</span>;
};


// Dashboard Component
function Dashboard({ products, loading, currentRole, connectedWallet, onAction }) {

    // --- Loading State ---
    if (loading) return (
        <div className="loading-container">
            <span className="spinner"></span> 
            <p>Fetching {currentRole} products from the blockchain...</p>
        </div>
    );

    // --- Empty State ---
    if (products.length === 0) {
        return <p className="no-products">No products found under your role's ownership or filter.</p>;
    }

    return (
        <div className="dashboard">
            <div className="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name & Origin</th>
                            <th>Qty / Unit</th>
                            <th>Price / Unit</th>
                            <th>Status</th>
                            <th>Proof (Hash)</th>
                            {/* Only show Actions column for Farmer/Wholesaler */}
                            {(currentRole === 'Farmer' || currentRole === 'Wholesaler') && (
                                <th>Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td>{Number(product.id)}</td>
                                <td>
                                    <strong>{product.name}</strong>
                                    <br />
                                    <span style={{ fontSize: '0.9em', color: 'var(--subtle-text-color)' }}>
                                        From: {product.origin}
                                    </span>
                                </td>
                                <td>
                                    {/* FIX: Format Quantity (which is a Number after conversion in App.js) */}
                                    {Number(product.quantity).toLocaleString()} {product.unit}
                                </td>
                                <td>{formatPrice(product.pricePerUnit)}</td>
                                <td>
                                    {/* Display State from mapping, ensuring product.currentState is a valid key (Number) */}
                                    <span className={`state-badge state-${product.currentState}`}>
                                        {STATE_MAPPING[product.currentState] || 'Unknown'}
                                    </span>
                                </td>
                                <td>
                                    {/* Link the initial transaction hash */}
                                    {product.txHash ? (
                                        <a 
                                            href={`${ETHERSCAN_URL}${product.txHash}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="etherscan-link"
                                        >
                                            {`${product.txHash.substring(0, 10)}...`}
                                            <span className="external-link-icon">↗</span>
                                        </a>
                                    ) : (
                                        <span className="no-hash">No Hash</span>
                                    )}
                                </td>
                                {/* Actions Column */}
                                {(currentRole === 'Farmer' || currentRole === 'Wholesaler') && (
                                    <td>
                                        <ProductActions 
                                            product={product} 
                                            currentRole={currentRole} 
                                            connectedWallet={connectedWallet} 
                                            onAction={onAction} // Passed the action function
                                            loading={loading} // Passed loading state
                                        />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Dashboard;
