import React, { useState } from 'react';
import { ethers } from 'ethers';
import Dashboard from './Dashboard';
import ProductHistoryModal from './ProductHistoryModal';
import FilterControls from './components/FilterControls';
import ExportButton from './components/ExportButton';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import BatchOperations from './components/BatchOperations';
import { useProductFilter } from './hooks/useProductFilter';
import { exportProductsToCSV } from './utils/exportUtils';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS, RETAILER_FOR_SALE_STATES } from './config';
import './App.css';

function ConsumerView({ products, loading, connectedWallet, fetchProducts, onLogout }) {
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Handle viewing product history
    const handleViewHistory = (product) => {
        setSelectedProduct(product);
        setHistoryModalOpen(true);
    };

    // Handle buying product from retailer
    const handleBuyProduct = async (productId, price) => {
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");
        
        // Format price for display
        const priceString = ethers.formatUnits(price, 0);
        
        setActionLoading(true);
        setActionMessage(`Preparing to buy Product ID ${productId} for ₹${priceString}...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            // Send the transaction with payment
            const tx = await contract.consumerBuyFromRetailer(productId, {
                value: price
            });

            setActionMessage('Transaction submitted. Waiting for confirmation...');
            await tx.wait();

            setActionMessage(`✅ Success! You now own Product ${productId}. Check your purchases below.`);
            fetchProducts(); // Refresh all data

        } catch (error) {
            console.error("Buy Product Error:", error);
            if (error.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else if (error.message.includes("Incorrect payment amount")) {
                setActionMessage("Error: Payment amount does not match product price.");
            } else if (error.message.includes("Caller must be a Consumer")) {
                setActionMessage("Error: Your connected wallet does not have the 'Consumer' role.");
            } else if (error.message.includes("Product not for sale")) {
                setActionMessage("Error: This product is no longer available for sale.");
            } else {
                setActionMessage(`Error buying product. Check console.`);
            }
        } finally {
            setActionLoading(false);
        }
    };

    // Handle rating retailer
    const handleRateRetailer = async (productId, score) => {
        if (score < 1 || score > 5) {
            return setActionMessage("Error: Rating must be between 1 and 5.");
        }
        
        setActionLoading(true);
        setActionMessage(`Submitting ${score}-star rating for retailer of Product ID ${productId}...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            const tx = await contract.consumerRateRetailer(productId, score);
            await tx.wait();

            setActionMessage(`✅ Success! Retailer rated for Product ${productId}.`);
            fetchProducts(); // Refresh data to hide the rating component

        } catch (error) {
            console.error("Rate Retailer Error:", error);
            if (error.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else if (error.message.includes("Retailer has already been rated")) {
                setActionMessage("Error: You have already rated the retailer for this product.");
            } else if (error.message.includes("Can only rate after purchase")) {
                setActionMessage("Error: You can only rate after purchasing the product.");
            } else {
                setActionMessage("Error submitting rating. Check console.");
            }
        } finally {
            setActionLoading(false);
        }
    };

    // Filter products for marketplace (state 6, not owned by me)
    const marketplaceProducts = products.filter(
        p => RETAILER_FOR_SALE_STATES.includes(p.currentState) &&
             p.owner.toLowerCase() !== connectedWallet.toLowerCase()
    );

    // Filter products for my purchases (owned by me)
    const myPurchases = products.filter(
        p => p.owner.toLowerCase() === connectedWallet.toLowerCase()
    );

    // Search & Filter Hooks
    const marketplaceFilter = useProductFilter(marketplaceProducts, 'consumer-marketplace');
    const purchasesFilter = useProductFilter(myPurchases, 'consumer-purchases');

    return (
        <>
            <button onClick={onLogout} className="back-button">
                &larr; Back to Home / Select Role
            </button>

            {/* Analytics Dashboard */}
            <div className="full-width-section animate-fade-in" style={{ marginBottom: '20px' }}>
                <AnalyticsDashboard products={products} role="Consumer" />
            </div>

            <div className="main-layout-single animate-fade-in">

                {/* Action Message Bar */}
                {actionMessage && (
                    <p className={`message ${actionMessage.startsWith('✅') ? 'message-success' : 'message-error'}`}>
                        {actionMessage}
                    </p>
                )}

                {/* CARD 1: Retailer Marketplace */}
                <div className="card full-width">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h2><span role="img" aria-label="market">🛒</span> Retailer Marketplace</h2>
                        <ExportButton products={marketplaceFilter.filteredProducts} filename="retailer_marketplace" />
                    </div>
                    <p>Products available for purchase from retailers.</p>
                    
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
                        searchPlaceholder="Search retailer products..."
                    />
                    
                    {/* Batch Operations */}
                    <BatchOperations
                        products={marketplaceFilter.filteredProducts}
                        onBatchAction={async (action, selectedProducts) => {
                            if (action === 'export') {
                                exportProductsToCSV(selectedProducts, 'retailer_marketplace_selected');
                            }
                        }}
                        availableActions={[
                            { id: 'export', label: 'Export Selected', icon: '📊', className: 'batch-btn-action' }
                        ]}
                        role="Consumer"
                    />
                    
                    <Dashboard
                        products={marketplaceFilter.filteredProducts}
                        loading={loading || actionLoading}
                        currentRole="Consumer"
                        connectedWallet={connectedWallet}
                        onAction={handleBuyProduct}
                        onSetPrice={() => {}} // Dummy function
                        onRate={() => {}} // Dummy function for marketplace
                        onViewHistory={handleViewHistory}
                    />
                </div>

                {/* CARD 2: My Purchases */}
                <div className="card full-width" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h2><span role="img" aria-label="shopping-bags">🛍️</span> My Purchases</h2>
                        <ExportButton products={purchasesFilter.filteredProducts} filename="my_purchases" />
                    </div>
                    <p>Products you have purchased. View full supply chain history and rate retailers.</p>
                    
                    {/* Search & Filter Controls */}
                    <FilterControls
                        searchTerm={purchasesFilter.searchTerm}
                        setSearchTerm={purchasesFilter.setSearchTerm}
                        filters={purchasesFilter.filters}
                        setFilters={purchasesFilter.setFilters}
                        sortBy={purchasesFilter.sortBy}
                        setSortBy={purchasesFilter.setSortBy}
                        clearFilters={purchasesFilter.clearFilters}
                        hasActiveFilters={purchasesFilter.hasActiveFilters}
                        totalProducts={purchasesFilter.totalProducts}
                        filteredCount={purchasesFilter.filteredCount}
                        searchPlaceholder="Search your purchases..."
                    />
                    
                    {/* Batch Operations */}
                    <BatchOperations
                        products={purchasesFilter.filteredProducts}
                        onBatchAction={async (action, selectedProducts) => {
                            if (action === 'export') {
                                exportProductsToCSV(selectedProducts, 'my_purchases_selected');
                            }
                        }}
                        availableActions={[
                            { id: 'export', label: 'Export Selected', icon: '📊', className: 'batch-btn-action' }
                        ]}
                        role="Consumer"
                    />
                    
                    <Dashboard
                        products={purchasesFilter.filteredProducts}
                        loading={loading || actionLoading}
                        currentRole="Consumer"
                        connectedWallet={connectedWallet}
                        onAction={() => {}} // No action for owned products
                        onSetPrice={() => {}} // Dummy function
                        onRate={handleRateRetailer}
                        onViewHistory={handleViewHistory}
                    />
                </div>
            </div>

            {/* Product History Modal */}
            {historyModalOpen && (
                <ProductHistoryModal
                    product={selectedProduct}
                    onClose={() => setHistoryModalOpen(false)}
                />
            )}
        </>
    );
}

export default ConsumerView;
