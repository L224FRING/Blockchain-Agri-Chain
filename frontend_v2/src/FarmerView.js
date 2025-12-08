import React, { useState } from 'react';
import { ethers } from 'ethers';
import AddProduct from './AddProduct';
import Dashboard from './Dashboard';
import ProductHistoryModal from './ProductHistoryModal';
import FilterControls from './components/FilterControls';
import ExportButton from './components/ExportButton';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import BatchOperations from './components/BatchOperations';
import { useProductFilter } from './hooks/useProductFilter';
import { exportProductsToCSV } from './utils/exportUtils';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS } from './config';
import './App.css';

function FarmerView({ products, loading, connectedWallet, fetchProducts, onLogout }) {
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [pendingProposals, setPendingProposals] = useState([]);
    const [proposalLoading, setProposalLoading] = useState(false);

    // Fetch pending proposals for farmer's products
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
                // Only check products I own and created
                if (product.farmer?.toLowerCase() === myWallet && product.owner.toLowerCase() === myWallet) {
                    try {
                        const proposal = await contract.transferProposals(product.id);
                        // Check if there's an active proposal (farmer confirmed, not executed)
                        if (proposal.proposer.toLowerCase() === myWallet && proposal.farmerConfirmed && !proposal.executed) {
                            proposals.push({
                                ...product,
                                proposalTarget: proposal.target,
                                proposalUsername: proposal.targetUsername,
                                wholesalerConfirmed: proposal.wholesalerConfirmed
                            });
                        }
                    } catch (err) {
                        // No proposal exists for this product, that's fine
                    }
                }
            }
            setPendingProposals(proposals);
        } catch (error) {
            console.error("Error fetching farmer proposals:", error);
        } finally {
            setProposalLoading(false);
        }
    }, [products, connectedWallet]);

    React.useEffect(() => {
        fetchMyProposals();
    }, [fetchMyProposals]);

    // --- FILTERING LOGIC ---

    // 1. Get ALL products created by this farmer
    const allMyProducts = products.filter(
        p => p.farmer && p.farmer.toLowerCase() === connectedWallet.toLowerCase()
    );

    // 2. Filter into "Inventory" (still owned, excluding those with pending proposals)
    const pendingProposalIds = new Set(pendingProposals.map(p => p.id));
    const myInventory = allMyProducts.filter(
        p => p.owner.toLowerCase() === connectedWallet.toLowerCase() && !pendingProposalIds.has(p.id)
    );

    // 3. Filter into "Sent" (owned by someone else)
    const sentProducts = allMyProducts.filter(
        p => p.owner.toLowerCase() !== connectedWallet.toLowerCase()
    );

    // --- SEARCH & FILTER HOOKS ---
    const inventoryFilter = useProductFilter(myInventory);
    const sentFilter = useProductFilter(sentProducts);

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

            {/* Analytics Dashboard */}
            <div className="full-width-section animate-fade-in" style={{ marginBottom: '20px' }}>
                <AnalyticsDashboard products={products} role="Farmer" useDemoData={true} />
            </div>

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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h2><span role="img" aria-label="tractor">🚜</span> Your Inventory ({myInventory.length})</h2>
                            <ExportButton products={inventoryFilter.filteredProducts} filename="farmer_inventory" />
                        </div>
                        
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
                                    // Export selected products to CSV
                                    exportProductsToCSV(selectedProducts, 'farmer_inventory_selected');
                                }
                            }}
                            availableActions={[
                                { id: 'export', label: 'Export Selected', icon: '📊', className: 'batch-btn-action' }
                            ]}
                            role="Farmer"
                        />
                        
                        <Dashboard
                            products={inventoryFilter.filteredProducts}
                            loading={loading || actionLoading}
                            currentRole="Farmer"
                            connectedWallet={connectedWallet}
                            onAction={shipToWholesaler}
                            onSetPrice={() => {}} // Dummy prop
                            onViewHistory={handleViewHistory}
                        />
                    </div>

                    {/* --- CARD 2: Pending Proposals --- */}
                    {pendingProposals.length > 0 && (
                        <div className="card dashboard-card">
                            <h2><span role="img" aria-label="hourglass">⏳</span> Pending Transfer Proposals ({pendingProposals.length})</h2>
                            <p>Products you've proposed to wholesalers. Waiting for their confirmation.</p>
                            
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
                                                <th>Proposed To</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingProposals.map(product => (
                                                <tr key={product.id}>
                                                    <td>{Number(product.id)}</td>
                                                    <td><strong>{product.name}</strong></td>
                                                    <td>{product.proposalUsername}</td>
                                                    <td>
                                                        {product.wholesalerConfirmed ? 
                                                            <span className="state-badge state-1">Confirmed - Shipping</span> : 
                                                            <span className="state-badge state-0">Awaiting Wholesaler</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- CARD 3: Sent Products --- */}
                    <div className="card dashboard-card" >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h2><span role="img" aria-label="truck">🚚</span> Sent Products ({sentProducts.length})</h2>
                            <ExportButton products={sentFilter.filteredProducts} filename="farmer_sent_products" />
                        </div>
                        <p>Products you have sold. You can track their ongoing journey here.</p>
                        
                        {/* Search & Filter Controls */}
                        <FilterControls
                            searchTerm={sentFilter.searchTerm}
                            setSearchTerm={sentFilter.setSearchTerm}
                            filters={sentFilter.filters}
                            setFilters={sentFilter.setFilters}
                            sortBy={sentFilter.sortBy}
                            setSortBy={sentFilter.setSortBy}
                            clearFilters={sentFilter.clearFilters}
                            hasActiveFilters={sentFilter.hasActiveFilters}
                            totalProducts={sentFilter.totalProducts}
                            filteredCount={sentFilter.filteredCount}
                            searchPlaceholder="Search sent products..."
                        />
                        
                        <Dashboard
                            products={sentFilter.filteredProducts}
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
