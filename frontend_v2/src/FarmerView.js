import React, { useState } from 'react';
import { ethers } from 'ethers';
import AddProduct from './AddProduct';
import Dashboard from './Dashboard';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS, STAKEHOLDER_ADDRESSES } from './config';
import './App.css'; 

// Enum values must match the contract (State.Harvested = 0, State.ShippedToWholesaler = 1)
const HARVESTED_STATE = 0;
const SHIPPED_TO_WHOLESALER_STATE = 1;

function FarmerView({ products, loading, connectedWallet, fetchProducts, onLogout }) {
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    // Filter products: Only show products currently owned by this wallet.
    // This allows the farmer to see all their inventory, regardless of state.
    const ownedProducts = products.filter(
        p => p.owner.toLowerCase() === connectedWallet.toLowerCase()
    );

    // Filter products that are Harvested (State 0) and ready for action (kept for logic, but not passed directly)
    const shipReadyProducts = ownedProducts.filter(
        p => p.currentState === HARVESTED_STATE
    );


    // --- Core Farmer Action: Ship to Wholesaler (Two Transactions) ---
    const shipToWholesaler = async (productId) => {
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");
        
        // Define the next owner's address (Wholesaler placeholder from config.js)
        const newOwnerAddress = STAKEHOLDER_ADDRESSES.Wholesaler;
        if (!newOwnerAddress) return setActionMessage("Error: Wholesaler address not configured.");

        setActionLoading(true);
        setActionMessage(`Shipping Product ID ${productId} to Wholesaler (${newOwnerAddress.substring(0,6)}...)...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            // 1. Transaction 1: Update State to SHIPPED_TO_WHOLESALER
            setActionMessage(`Step 1/2: Waiting for signature to update state...`);
            
            const tx1 = await contract.updateProductState(productId, SHIPPED_TO_WHOLESALER_STATE);
            
            setActionMessage(`State transaction submitted. Waiting for confirmation (1/2)...`);
            await tx1.wait(); 

            // 2. Transaction 2: Transfer Ownership
            setActionMessage(`Step 2/2: Waiting for signature to transfer ownership...`);

            const tx2 = await contract.transferOwnership(productId, newOwnerAddress);

            setActionMessage(`Ownership transaction submitted. Waiting for confirmation (2/2)... TxHash: ${tx2.hash.substring(0, 10)}...`);
            await tx2.wait(); 

            setActionMessage(`✅ Success! Product ${productId} shipped and ownership transferred to Wholesaler.`);
            fetchProducts(); // Refresh dashboard data

        } catch (error) {
            console.error("Farmer Ship Error:", error);
            if (error.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else {
                setActionMessage(`Error shipping product. Check console.`);
            }
        } finally {
            setActionLoading(false);
        }
    };


    return (
        <>
            {/* Back to Home Button */}
            <button onClick={onLogout} className="back-button">
                &larr; Back to Home / Select Role
            </button>
            
            {/* Display action messages */}
            {actionMessage && (
                 <p className={`message ${actionMessage.startsWith('✅') ? 'message-success' : 'message-error'}`}>
                     {actionMessage}
                 </p>
            )}

            {/* Use the two-column main layout defined in App.css */}
            <div className="main-layout animate-fade-in">

                {/* Left Column: Add Product Form (Phase 1) */}
                <div className="card add-product-card">
                    <h2><span role="img" aria-label="seedling">➕</span> Add New Product</h2>
                    <AddProduct onProductAdded={fetchProducts} />
                </div>

                {/* Right Column: Dashboard showing products ready for shipping */}
                <div className="card dashboard-card">
                    {/* TITLE: Show total inventory count */}
                    <h2><span role="img" aria-label="tractor">🚜</span> Your Inventory ({ownedProducts.length})</h2>
                    
                    {/* FIX: Pass ALL ownedProducts to the dashboard for display. */}
                    <Dashboard
                        products={ownedProducts} /* <-- PASS ALL OWNED PRODUCTS (FIXED) */
                        loading={loading || actionLoading}
                        currentRole="Farmer"
                        connectedWallet={connectedWallet}
                        onAction={shipToWholesaler} // Pass the shipping function
                    />
                </div>
            </div>
        </>
    );
}

export default FarmerView;
