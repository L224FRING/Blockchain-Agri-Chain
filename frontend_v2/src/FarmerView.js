import React, { useState } from 'react';
import { ethers } from 'ethers';
import AddProduct from './AddProduct';
import Dashboard from './Dashboard';
import ProductHistoryModal from './ProductHistoryModal'; // Import the history modal
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS } from './config';
import './App.css';

function FarmerView({ products, loading, connectedWallet, fetchProducts, onLogout }) {
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    // Modal State
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // --- NEW FILTERING LOGIC ---

    // 1. Get ALL products created by this farmer
    const allMyProducts = products.filter(
        p => p.farmer && p.farmer.toLowerCase() === connectedWallet.toLowerCase()
    );

    // 2. Filter into "Inventory" (still owned)
    const myInventory = allMyProducts.filter(
        p => p.owner.toLowerCase() === connectedWallet.toLowerCase()
    );

    // 3. Filter into "Sent" (owned by someone else)
    const sentProducts = allMyProducts.filter(
        p => p.owner.toLowerCase() !== connectedWallet.toLowerCase()
    );

    // --- (shipToWholesaler function is unchanged) ---
    const shipToWholesaler = async (productId, wholesalerUsername) => {
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");
        if (!wholesalerUsername || wholesalerUsername.length === 0) return setActionMessage('Error: Please provide a wholesaler username.');

        setActionLoading(true);
        setActionMessage(`Proposing transfer for Product ID ${productId} to wholesaler '${wholesalerUsername}'...`);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);
            const tx = await contract.proposeTransferToWholesaler(productId, wholesalerUsername);
            setActionMessage('Transaction submitted. Waiting for confirmation...');
            await tx.wait();
            setActionMessage(`✅ Proposal submitted for Product ${productId} to '${wholesalerUsername}'.`);
            fetchProducts();
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

    // --- History Modal Handler ---
    const handleViewHistory = (product) => {
        setSelectedProduct(product);
        setHistoryModalOpen(true);
    };

    return (
        <>
            <button onClick={onLogout} className="back-button">
                &larr; Back to Home / Select Role
            </button>
            
            {actionMessage && (
                <p className={`message ${actionMessage.startsWith('✅') ? 'message-success' : 'message-error'}`}>
                    {actionMessage}
                </p>
            )}

            <div className="main-layout animate-fade-in">

                {/* Left Column: Add Product Form (Unchanged) */}
                <div className="card add-product-form">
                    <h2><span role="img" aria-label="seedling">➕</span> Add New Product</h2>
                    <AddProduct onProductAdded={(hash, productId) => {
                        fetchProducts(hash, productId); // Pass hash and ID
                    }} />
                </div>

                {/* Right Column: Farmer's Dashboards */}
                <div className="dashboard-column">
                    {/* --- CARD 1: My Inventory --- */}
                    <div className="card dashboard-card">
                        <h2><span role="img" aria-label="tractor">🚜</span> Your Inventory ({myInventory.length})</h2>
                        <Dashboard
                            products={myInventory}
                            loading={loading || actionLoading}
                            currentRole="Farmer"
                            connectedWallet={connectedWallet}
                            onAction={shipToWholesaler}
                            onSetPrice={() => {}} // Dummy prop
                            onViewHistory={handleViewHistory}
                        />
                    </div>

                    {/* --- CARD 2: Sent Products --- */}
                    <div className="card dashboard-card" >
                        <h2><span role="img" aria-label="truck">🚚</span> Sent Products ({sentProducts.length})</h2>
                        <p>Products you have sold. You can track their ongoing journey here.</p>
                        <Dashboard
                            products={sentProducts}
                            loading={loading || actionLoading}
                            currentRole="Farmer" // Keep role as Farmer
                            connectedWallet={connectedWallet}
                            onAction={() => {}} // No actions on sent products
                            onSetPrice={() => {}} // No actions on sent products
                            onViewHistory={handleViewHistory} // History button WILL work
                        />
                    </div>
                </div>
            </div>

            {/* Render the Modal */}
            {historyModalOpen && (
                <ProductHistoryModal
                    product={selectedProduct}
                    onClose={() => setHistoryModalOpen(false)}
                />
            )}
        </>
    );
}

export default FarmerView;
