import React, { useState, useEffect, useCallback } from 'react';
import ProductHistoryModal from './ProductHistoryModal';
import RatingBadge from './RatingBadge';
import FilterControls from './components/FilterControls';
import ExportButton from './components/ExportButton';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import BatchOperations from './components/BatchOperations';
import { useProductFilter } from './hooks/useProductFilter';
import { exportProductsToCSV } from './utils/exportUtils';
import { ethers } from 'ethers';
import Dashboard from './Dashboard';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS } from './config';
import './App.css';

// Enum values from your contract
const SHIPPED_TO_WHOLESALER_STATE = 1;
const RECEIVED_BY_WHOLESALER_STATE = 2;

function WholesalerView({ products, loading, connectedWallet, fetchProducts, onLogout }) {
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);
    const [inboxLoading, setInboxLoading] = useState(true);
    const [pendingProposals, setPendingProposals] = useState([]);

    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const handleViewHistory = (product) => {
        setSelectedProduct(product);
        setHistoryModalOpen(true);
    };
    // ... (fetchMyPendingProposals function is unchanged) ...
    const fetchMyPendingProposals = useCallback(async () => {
        if (!connectedWallet || !window.ethereum || products.length === 0) {
            setPendingProposals([]); setInboxLoading(false); return;
        }
        setInboxLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, provider);
            const myWallet = connectedWallet.toLowerCase();
            const inbox = [];
            for (const product of products) {
                try {
                    const p = await contract.transferProposals(product.id);
                    if (p.target.toLowerCase() === myWallet && p.farmerConfirmed && !p.wholesalerConfirmed && !p.executed) {
                        inbox.push(product);
                    }
                } catch (err) { console.error(`Error fetching proposal for product ${product.id}:`, err.message); }
            }
            setPendingProposals(inbox);
        } catch (error) {
            console.error("Error fetching wholesaler proposals:", error);
            setActionMessage("Error: Could not load transfer proposals.");
            setPendingProposals([]);
        } finally {
            setInboxLoading(false);
        }
    }, [products, connectedWallet]);

    useEffect(() => {
        fetchMyPendingProposals();
    }, [fetchMyPendingProposals]);

    // ... (acceptTransfer function is unchanged) ...
    const acceptTransfer = async (productId) => {
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");
        setActionLoading(true);
        setActionMessage(`Accepting transfer for Product ID ${productId}...`);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);
            const tx = await contract.wholesalerConfirmTransfer(productId);
            setActionMessage('Transaction submitted. Waiting for confirmation...');
            await tx.wait();
            // This is correct. It sets state to 1.
            setActionMessage(`✅ Success! Product ${productId} accepted. It is now in your inventory pending receipt confirmation.`);
            fetchProducts();
        } catch (error) {
            console.error("Accept Transfer Error:", error);
            if (error.code === 4001) setActionMessage('Error: Transaction rejected by user.');
            else setActionMessage(`Error accepting transfer. Check console.`);
        } finally {
            setActionLoading(false);
        }
    };
    
    // --- NEW: Function to confirm receipt of goods ---
    // This moves the product from State 1 to State 2
    const handleConfirmReceipt = async (productId) => {
        setActionLoading(true);
        setActionMessage(`Confirming physical receipt for Product ID ${productId}...`);
        
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            // Call the general-purpose updateProductState function
            const tx = await contract.updateProductState(productId, RECEIVED_BY_WHOLESALER_STATE);
            await tx.wait();

            setActionMessage(`✅ Success! Product ${productId} is now received and ready for pricing.`);
            fetchProducts(); // Refresh data

        } catch (error) {
            console.error("Confirm Receipt Error:", error);
            if (error.code === 4001) setActionMessage('Error: Transaction rejected by user.');
            else if (error.message.includes("Wholesaler can only receive")) {
                 setActionMessage("Error: Product is not in the 'ShippedToWholesaler' state.");
            }
            else setActionMessage("Error confirming receipt. Check console.");
        } finally {
            setActionLoading(false);
        }
    };
    
    // ... (handleSetPrice function is unchanged) ...
    const handleSetPrice = async (productId, markupString) => {
        const markupPercentage = parseInt(markupString, 10);
        if (isNaN(markupPercentage) || markupPercentage <= 0) {
            return setActionMessage("Error: Please enter a valid, positive markup percentage (e.g., 20).");
        }
        setActionLoading(true);
        setActionMessage(`Setting new price for Product ID ${productId} with ${markupPercentage}% markup...`);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);
            const tx = await contract.wholesalerSetPrice(productId, markupPercentage);
            await tx.wait();
            setActionMessage(`✅ Success! Price updated for Product ${productId}.`);
            fetchProducts();
        } catch (error) {
            console.error("Set Price Error:", error);
            if (error.code === 4001) setActionMessage('Error: Transaction rejected by user.');
            else setActionMessage("Error setting price. Check console.");
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleRateFarmer = async (productId, score) => {
        if (score < 1 || score > 5) {
            return setActionMessage("Error: Rating must be between 1 and 5.");
        }
        
        setActionLoading(true);
        setActionMessage(`Submitting ${score}-star rating for farmer of Product ID ${productId}...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            // This is the new contract function
            const tx = await contract.wholesalerRateFarmer(productId, score);
            await tx.wait();

            setActionMessage(`✅ Success! Farmer rated for Product ${productId}.`);
            fetchProducts(); // Refresh data to hide the rating component

        } catch (error) {
            console.error("Rate Farmer Error:", error);
            if (error.code === 4001) setActionMessage('Error: Transaction rejected by user.');
            else if (error.message.includes("Farmer has already been rated")) {
                setActionMessage("Error: You have already rated the farmer for this product.");
            }
            else setActionMessage("Error submitting rating. Check console.");
        } finally {
            setActionLoading(false);
        }
    };

    // --- NEW: Retailer Proposal Management ---
    const [retailerProposals, setRetailerProposals] = useState([]);
    const [retailerProposalLoading, setRetailerProposalLoading] = useState(false);

    const fetchRetailerProposals = useCallback(async () => {
        if (!connectedWallet || !window.ethereum || products.length === 0) {
            setRetailerProposals([]);
            return;
        }
        
        setRetailerProposalLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, provider);
            const myWallet = connectedWallet.toLowerCase();
            const proposals = [];
            
            // Check owned products in states 2 or 3
            const ownedProducts = products.filter(
                p => p.owner.toLowerCase() === myWallet && (p.currentState === 2 || p.currentState === 3)
            );
            
            for (const product of ownedProducts) {
                try {
                    const proposal = await contract.retailerTransferProposals(product.id);
                    if (proposal.target.toLowerCase() === myWallet && !proposal.executed) {
                        proposals.push({
                            ...product,
                            retailerAddress: proposal.proposer,
                            proposedPrice: proposal.proposedPrice
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching retailer proposal for product ${product.id}:`, err.message);
                }
            }
            setRetailerProposals(proposals);
        } catch (error) {
            console.error("Error fetching retailer proposals:", error);
        } finally {
            setRetailerProposalLoading(false);
        }
    }, [products, connectedWallet]);

    useEffect(() => {
        fetchRetailerProposals();
    }, [fetchRetailerProposals]);

    const handleAcceptRetailerPurchase = async (productId) => {
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");
        
        setActionLoading(true);
        setActionMessage(`Accepting retailer purchase for Product ID ${productId}...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            const tx = await contract.wholesalerConfirmRetailerPurchase(productId);
            await tx.wait();

            setActionMessage(`✅ Success! Retailer purchase confirmed for Product ${productId}. Payment received.`);
            fetchProducts();
            fetchRetailerProposals();

        } catch (error) {
            console.error("Accept Retailer Purchase Error:", error);
            if (error.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else {
                setActionMessage("Error accepting purchase. Check console.");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectRetailerPurchase = async (productId) => {
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");
        
        if (!window.confirm("Are you sure you want to reject this purchase proposal? The payment will be refunded to the retailer.")) {
            return;
        }
        
        setActionLoading(true);
        setActionMessage(`Rejecting retailer purchase for Product ID ${productId}...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            const tx = await contract.wholesalerRejectRetailerPurchase(productId);
            await tx.wait();

            setActionMessage(`✅ Purchase proposal rejected for Product ${productId}. Payment refunded to retailer.`);
            fetchProducts();
            fetchRetailerProposals();

        } catch (error) {
            console.error("Reject Retailer Purchase Error:", error);
            if (error.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else {
                setActionMessage("Error rejecting purchase. Check console.");
            }
        } finally {
            setActionLoading(false);
        }
    };

    // Filter for "My Inventory" (unchanged)
    const myInventory = products.filter(
        p => p.owner.toLowerCase() === connectedWallet.toLowerCase()
    );

    // Search & Filter Hook
    const inventoryFilter = useProductFilter(myInventory);

    return (
        <>
            <button onClick={onLogout} className="back-button">
                &larr; Back to Home / Select Role
            </button>

            {/* Analytics Dashboard */}
            <div className="full-width-section animate-fade-in" style={{ marginBottom: '20px' }}>
                <AnalyticsDashboard products={products} role="Wholesaler" />
            </div>

            <div className="main-layout-single animate-fade-in">
                {actionMessage && (
                    <p className={`message ${actionMessage.startsWith('✅') ? 'message-success' : 'message-error'}`}>
                        {actionMessage}
                    </p>
                )}

                {/* --- CARD 1: INBOX (Unchanged) --- */}
                <div className="card full-width">
                   {/* ... (Your existing Inbox UI) ... */}
                   <h2><span role="img" aria-label="inbox">📥</span> Incoming Transfer Proposals</h2>
                    <p>These are products proposed by farmers for you to accept. Accepting will transfer ownership to you.</p>
                    {(inboxLoading || actionLoading) ? (
                        <div className="loading-container"><span className="spinner"></span><p>Loading proposals...</p></div>
                    ) : pendingProposals.length === 0 ? (
                        <p className="no-products">No pending proposals found for your address.</p>
                    ) : (
                        <div className="table-responsive">
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Product</th>
                <th>From (Origin)</th>
                <th>Qty / Unit</th>
                <th>Farmer Rating</th> {/* <-- NEW COLUMN */}
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            {pendingProposals.map(product => (
                <tr key={product.id}>
                    <td>{Number(product.id)}</td>
                    <td><strong>{product.name}</strong></td>
                    <td>{product.origin}</td>
                    <td>{Number(product.quantity)} {product.unit}</td>
                    
                    {/* --- THIS IS THE FIX --- */}
                    <td>
                        <RatingBadge 
                            userAddress={product.farmer} 
                            label="" 
                        />
                    </td>
                    {/* --- END OF FIX --- */}
                    
                    <td>
                        <button
                            onClick={() => acceptTransfer(product.id)}
                            className="button-action button-receive"
                            disabled={actionLoading}
                        >
                            Accept Transfer
                        </button>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
</div>
                    )}
                </div>

                {/* --- CARD 2: RETAILER PURCHASE PROPOSALS (NEW) --- */}
                {retailerProposals.length > 0 && (
                    <div className="card full-width" style={{ marginTop: '2rem' }}>
                        <h2><span role="img" aria-label="shopping-cart">🛍️</span> Retailer Purchase Proposals</h2>
                        <p>Retailers want to buy these products. Payment is held in escrow until you confirm.</p>
                        
                        {retailerProposalLoading ? (
                            <div className="loading-container">
                                <span className="spinner"></span>
                                <p>Loading retailer proposals...</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Product</th>
                                            <th>Retailer</th>
                                            <th>Price</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {retailerProposals.map(product => (
                                            <tr key={product.id}>
                                                <td>{Number(product.id)}</td>
                                                <td><strong>{product.name}</strong></td>
                                                <td>
                                                    <span style={{ fontSize: '0.85em' }}>
                                                        {`${product.retailerAddress.substring(0, 6)}...${product.retailerAddress.substring(product.retailerAddress.length - 4)}`}
                                                    </span>
                                                </td>
                                                <td>{ethers.formatUnits(product.proposedPrice, 0)} ₹</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={() => handleAcceptRetailerPurchase(product.id)}
                                                            className="button-action button-receive"
                                                            disabled={actionLoading}
                                                        >
                                                            Accept & Ship
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectRetailerPurchase(product.id)}
                                                            className="button-action"
                                                            disabled={actionLoading}
                                                            style={{ backgroundColor: '#e74c3c' }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* --- CARD 3: MY INVENTORY (UPDATED) --- */}
                <div className="card full-width" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h2><span role="img" aria-label="factory">🏭</span> My Inventory</h2>
                        <ExportButton products={inventoryFilter.filteredProducts} filename="wholesaler_inventory" />
                    </div>
                    <p>Products you own. Confirm receipt, then set a price to sell to retailers.</p>
                    
                    {/* Search & Filter Controls */}
                    <FilterControls
                        searchTerm={inventoryFilter.searchTerm}
                        setSearchTerm={inventoryFilter.setSearchTerm}
                        filters={inventoryFilter.filters}
                        setFilters={inventoryFilter.setFilters}
                        sortBy={inventoryFilter.sortBy}
                        setSortBy={inventoryFilter.setSortBy}
                        clearFilters={inventoryFilter.clearFilters}
                        hasActiveFilters={inventoryFilter.hasActiveFilters}
                        totalProducts={inventoryFilter.totalProducts}
                        filteredCount={inventoryFilter.filteredCount}
                        searchPlaceholder="Search your inventory..."
                    />
                    
                    {/* Batch Operations */}
                    <BatchOperations
                        products={inventoryFilter.filteredProducts}
                        onBatchAction={async (action, selectedProducts) => {
                            if (action === 'export') {
                                exportProductsToCSV(selectedProducts, 'wholesaler_inventory_selected');
                            }
                        }}
                        availableActions={[
                            { id: 'export', label: 'Export Selected', icon: '📊', className: 'batch-btn-action' }
                        ]}
                        role="Wholesaler"
                    />
                    
                    <Dashboard
                        products={inventoryFilter.filteredProducts}
                        loading={loading || actionLoading} 
                        currentRole="Wholesaler"
                        connectedWallet={connectedWallet}
                        // Pass the new receipt handler to onAction
                        onAction={handleConfirmReceipt}
                        onSetPrice={handleSetPrice} 
                        onRate={handleRateFarmer}
                        onViewHistory={handleViewHistory}
                    />
                </div>
            </div>
                           {historyModalOpen && (
                <ProductHistoryModal
                    product={selectedProduct}
                    onClose={() => setHistoryModalOpen(false)}
                />
            )}

        </>
    );
}

export default WholesalerView;
