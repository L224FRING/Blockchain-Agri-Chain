import React, { useState } from 'react';
import ProductHistoryModal from './ProductHistoryModal';
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

// States where a product is considered "for sale" by a wholesaler
const WHOLESALER_FOR_SALE_STATES = [
    2, // ReceivedByWholesaler
    3  // Processed
];

function RetailerView({ products, loading, connectedWallet, fetchProducts, onLogout }) {
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [pendingProposals, setPendingProposals] = useState([]);
    const [proposalLoading, setProposalLoading] = useState(false);

    // Fetch my pending proposals
    const fetchMyProposals = React.useCallback(async () => {
        if (!connectedWallet || !window.ethereum || products.length === 0) {
            setPendingProposals([]);
            return;
        }
        
        setProposalLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, provider);
            const myWallet = connectedWallet.toLowerCase();
            const proposals = [];
            
            for (const product of products) {
                try {
                    const proposal = await contract.retailerTransferProposals(product.id);
                    if (proposal.proposer.toLowerCase() === myWallet && !proposal.executed) {
                        proposals.push({
                            ...product,
                            proposalConfirmed: proposal.wholesalerConfirmed
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching proposal for product ${product.id}:`, err.message);
                }
            }
            setPendingProposals(proposals);
        } catch (error) {
            console.error("Error fetching retailer proposals:", error);
        } finally {
            setProposalLoading(false);
        }
    }, [products, connectedWallet]);

    React.useEffect(() => {
        fetchMyProposals();
    }, [fetchMyProposals]);

    /**
     * Propose purchase from wholesaler with payment escrow
     */
    const handleProposePurchase = async (productId, price) => {
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");

        const priceString = ethers.formatUnits(price, 0);
        
        setActionLoading(true);
        setActionMessage(`Proposing purchase for Product ID ${productId} for ₹${priceString}...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            const tx = await contract.proposeRetailerPurchase(productId, {
                value: price
            });

            setActionMessage('Transaction submitted. Waiting for confirmation...');
            await tx.wait();

            setActionMessage(`✅ Success! Purchase proposal submitted for Product ${productId}. Payment is held in escrow.`);
            fetchProducts();
            fetchMyProposals();

        } catch (error) {
            console.error("Propose Purchase Error:", error);
            if (error.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else if (error.message.includes("Incorrect payment amount")) {
                setActionMessage("Error: Payment amount does not match product price.");
            } else if (error.message.includes("Caller must be a Retailer")) {
                setActionMessage("Error: Your connected wallet does not have the 'Retailer' role.");
            } else if (error.message.includes("Active proposal already exists")) {
                setActionMessage("Error: You already have a pending proposal for this product.");
            } else {
                setActionMessage(`Error proposing purchase. Check console.`);
            }
        } finally {
            setActionLoading(false);
        }
    };

    /**
     * Cancel a pending proposal and get refund
     */
    const handleCancelProposal = async (productId) => {
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");
        
        setActionLoading(true);
        setActionMessage(`Cancelling proposal for Product ID ${productId}...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            const tx = await contract.cancelRetailerProposal(productId);
            await tx.wait();

            setActionMessage(`✅ Success! Proposal cancelled and payment refunded for Product ${productId}.`);
            fetchProducts();
            fetchMyProposals();

        } catch (error) {
            console.error("Cancel Proposal Error:", error);
            if (error.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else if (error.message.includes("Cannot cancel after wholesaler confirmation")) {
                setActionMessage("Error: Cannot cancel - wholesaler has already confirmed.");
            } else {
                setActionMessage("Error cancelling proposal. Check console.");
            }
        } finally {
            setActionLoading(false);
        }
    };

    /**
     * Confirm receipt of product (state 4 -> 5)
     */
    const handleConfirmReceipt = async (productId) => {
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");
        
        setActionLoading(true);
        setActionMessage(`Confirming receipt for Product ID ${productId}...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            const tx = await contract.updateProductState(productId, 5); // State 5 = ReceivedByRetailer
            await tx.wait();

            setActionMessage(`✅ Success! Product ${productId} received. You can now list it for sale.`);
            fetchProducts();

        } catch (error) {
            console.error("Confirm Receipt Error:", error);
            if (error.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else if (error.message.includes("Retailer can only receive")) {
                setActionMessage("Error: Product is not in the correct state.");
            } else {
                setActionMessage("Error confirming receipt. Check console.");
            }
        } finally {
            setActionLoading(false);
        }
    };

    /**
     * List product for sale with markup (state 5 -> 6)
     */
    const handleListForSale = async (productId, markupPercentage) => {
        const markup = parseInt(markupPercentage, 10);
        if (isNaN(markup) || markup <= 0) {
            return setActionMessage("Error: Please enter a valid, positive markup percentage.");
        }
        
        setActionLoading(true);
        setActionMessage(`Listing Product ID ${productId} for sale with ${markup}% markup...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            const tx = await contract.retailerListForSale(productId, markup);
            await tx.wait();

            setActionMessage(`✅ Success! Product ${productId} is now listed for sale.`);
            fetchProducts();

        } catch (error) {
            console.error("List For Sale Error:", error);
            if (error.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else if (error.message.includes("Product must be received by retailer")) {
                setActionMessage("Error: Product must be in 'Received' state to list.");
            } else {
                setActionMessage("Error listing product. Check console.");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleRateWholesaler = async (productId, score) => {
        if (score < 1 || score > 5) {
            return setActionMessage("Error: Rating must be between 1 and 5.");
        }
        
        setActionLoading(true);
        setActionMessage(`Submitting ${score}-star rating for wholesaler of Product ID ${productId}...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            // This is the new contract function
            const tx = await contract.retailerRateWholesaler(productId, score);
            await tx.wait();

            setActionMessage(`✅ Success! Wholesaler rated for Product ${productId}.`);
            fetchProducts(); // Refresh data to hide the rating component

        } catch (error) {
            console.error("Rate Wholesaler Error:", error);
            if (error.code === 4001) setActionMessage('Error: Transaction rejected by user.');
            else if (error.message.includes("Wholesaler has already been rated")) {
                setActionMessage("Error: You have already rated the wholesaler for this product.");
            }
            else setActionMessage("Error submitting rating. Check console.");
        } finally {
            setActionLoading(false);
        }
    };

    // --- Filter Products ---

    // 1. Marketplace: Products for sale by wholesalers (States 2 or 3) AND not owned by me
    const marketplaceProducts = products.filter(
        p => WHOLESALER_FOR_SALE_STATES.includes(p.currentState) &&
             p.owner.toLowerCase() !== connectedWallet.toLowerCase()
    );

    // 2. My Inventory: Products owned by me (the retailer)
    const myInventory = products.filter(
        p => p.owner.toLowerCase() === connectedWallet.toLowerCase()
    );

    // Search & Filter Hooks
    const marketplaceFilter = useProductFilter(marketplaceProducts);
    const inventoryFilter = useProductFilter(myInventory);

    const handleViewHistory = (product) => {
        setSelectedProduct(product);
        setHistoryModalOpen(true);
    };


    return (
        <>
            <button onClick={onLogout} className="back-button">
                &larr; Back to Home / Select Role
            </button>

            {/* Analytics Dashboard */}
            <div className="full-width-section animate-fade-in" style={{ marginBottom: '20px' }}>
                <AnalyticsDashboard products={products} role="Retailer" />
            </div>

            <div className="main-layout-single animate-fade-in">

                {/* --- Action Message Bar --- */}
                {actionMessage && (
                    <p className={`message ${actionMessage.startsWith('✅') ? 'message-success' : 'message-error'}`}>
                        {actionMessage}
                    </p>
                )}

                {/* --- CARD 1: Marketplace (Products to Propose Purchase) --- */}
                <div className="card full-width">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h2><span role="img" aria-label="market">🛒</span> Wholesaler Marketplace</h2>
                        <ExportButton products={marketplaceFilter.filteredProducts} filename="wholesaler_marketplace" />
                    </div>
                    <p>Products available for purchase from wholesalers. Propose purchase with payment held in escrow.</p>
                    
                    {/* Search & Filter Controls */}
                    <FilterControls
                        searchTerm={marketplaceFilter.searchTerm}
                        setSearchTerm={marketplaceFilter.setSearchTerm}
                        filters={marketplaceFilter.filters}
                        setFilters={marketplaceFilter.setFilters}
                        sortBy={marketplaceFilter.sortBy}
                        setSortBy={marketplaceFilter.setSortBy}
                        clearFilters={marketplaceFilter.clearFilters}
                        hasActiveFilters={marketplaceFilter.hasActiveFilters}
                        totalProducts={marketplaceFilter.totalProducts}
                        filteredCount={marketplaceFilter.filteredCount}
                        searchPlaceholder="Search wholesaler products..."
                    />
                    
                    {/* Batch Operations */}
                    <BatchOperations
                        products={marketplaceFilter.filteredProducts}
                        onBatchAction={async (action, selectedProducts) => {
                            if (action === 'export') {
                                exportProductsToCSV(selectedProducts, 'wholesaler_marketplace_selected');
                            }
                        }}
                        availableActions={[
                            { id: 'export', label: 'Export Selected', icon: '📊', className: 'batch-btn-action' }
                        ]}
                        role="Retailer"
                    />
                    
                    <Dashboard
                        products={marketplaceFilter.filteredProducts}
                        loading={loading || actionLoading}
                        currentRole="Retailer"
                        connectedWallet={connectedWallet}
                        onAction={handleProposePurchase}
                        onSetPrice={() => {}}
                        onRate={() => {}}
                        onViewHistory={handleViewHistory}
                    />
                </div>

                {/* --- CARD 2: Pending Proposals --- */}
                {pendingProposals.length > 0 && (
                    <div className="card full-width" style={{ marginTop: '2rem' }}>
                        <h2><span role="img" aria-label="hourglass">⏳</span> Pending Purchase Proposals</h2>
                        <p>Your purchase proposals waiting for wholesaler confirmation. Payment is held in escrow.</p>
                        
                        {proposalLoading ? (
                            <div className="loading-container">
                                <span className="spinner"></span>
                                <p>Loading proposals...</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Product</th>
                                            <th>Price</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingProposals.map(product => (
                                            <tr key={product.id}>
                                                <td>{Number(product.id)}</td>
                                                <td><strong>{product.name}</strong></td>
                                                <td>{ethers.formatUnits(product.pricePerUnit, 0)} ₹</td>
                                                <td>
                                                    {product.proposalConfirmed ? 
                                                        <span className="state-badge state-1">Confirmed - Shipping</span> : 
                                                        <span className="state-badge state-0">Awaiting Wholesaler</span>
                                                    }
                                                </td>
                                                <td>
                                                    {!product.proposalConfirmed && (
                                                        <button
                                                            onClick={() => handleCancelProposal(product.id)}
                                                            className="button-action"
                                                            disabled={actionLoading}
                                                            style={{ backgroundColor: '#e74c3c' }}
                                                        >
                                                            Cancel & Refund
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* --- CARD 3: My Inventory (Owned Products) --- */}
                <div className="card full-width" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h2><span role="img" aria-label="shop">🏬</span> My Inventory</h2>
                        <ExportButton products={inventoryFilter.filteredProducts} filename="retailer_inventory" />
                    </div>
                    <p>Products you own. Confirm receipt, list for sale, and rate wholesalers.</p>
                    
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
                                exportProductsToCSV(selectedProducts, 'retailer_inventory_selected');
                            }
                        }}
                        availableActions={[
                            { id: 'export', label: 'Export Selected', icon: '📊', className: 'batch-btn-action' }
                        ]}
                        role="Retailer"
                    />
                    
                    <Dashboard
                        products={inventoryFilter.filteredProducts}
                        loading={loading || actionLoading}
                        currentRole="Retailer" 
                        connectedWallet={connectedWallet}
                        onAction={handleConfirmReceipt}
                        onSetPrice={handleListForSale}
                        onRate={handleRateWholesaler}
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

export default RetailerView;
