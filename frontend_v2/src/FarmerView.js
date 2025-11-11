import React, { useState } from 'react';
import { ethers } from 'ethers';
import AddProduct from './AddProduct';
import Dashboard from './Dashboard';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS, AUTHORIZED_ADDRESSES } from './config';
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


    // --- Core Farmer Action: Propose transfer to Wholesaler by username ---
    // onAction now passes (productId, wholesalerUsername)
    const shipToWholesaler = async (productId, wholesalerUsername) => {
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");
        if (!wholesalerUsername || wholesalerUsername.length === 0) return setActionMessage('Error: Please provide a wholesaler username.');

        setActionLoading(true);
        setActionMessage(`Proposing transfer for Product ID ${productId} to wholesaler '${wholesalerUsername}'...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            // Call the new proposeTransferToWholesaler which resolves username -> address on-chain
            const tx = await contract.proposeTransferToWholesaler(productId, wholesalerUsername);
            setActionMessage('Transaction submitted. Waiting for confirmation...');
            await tx.wait();

            setActionMessage(`✅ Proposal submitted for Product ${productId} to '${wholesalerUsername}'. Waiting for wholesaler confirmation.`);
            fetchProducts(); // Refresh dashboard data

        } catch (error) {
            console.error("Propose Transfer Error:", error);
            if (error?.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else {
                setActionMessage(`Error proposing transfer. See console for details.`);
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
                    <AddProduct onProductAdded={(hash, productId) => {
                        console.log(`Product added: hash=${hash}, productId=${productId}`);
                        fetchProducts();
                    }} />
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
