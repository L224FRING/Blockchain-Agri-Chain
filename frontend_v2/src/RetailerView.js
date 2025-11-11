import React from 'react';
import Dashboard from './Dashboard'; // Re-use the Dashboard component
// Import authorized addresses to identify the Wholesaler
import { AUTHORIZED_ADDRESSES, STATE_MAPPING } from './config';
import './App.css'; // Re-use App.css for styling

// Define relevant states for Retailer visibility:
// Anything from ShippedToWholesaler onwards, up to potentially being sold.
const RETAILER_VISIBLE_STATES = [1, 2, 3, 4, 5, 6]; // ShippedToWholesaler, ReceivedByWholesaler, Processed, ShippedToRetailer, ReceivedByRetailer, ForSale

function RetailerView({ products, loading, connectedWallet, fetchProducts, onLogout }) {

  // --- Filtering Logic: Show products relevant to the Retailer's perspective ---
  const retailerVisibleProducts = products.filter(p => {
    const ownerLower = p.owner.toLowerCase();
  const wholesalerLower = (AUTHORIZED_ADDRESSES.Wholesaler && AUTHORIZED_ADDRESSES.Wholesaler[0].toLowerCase()) || '';
    const connectedLower = connectedWallet.toLowerCase(); // The wallet logged in AS Retailer

    // Condition 1: Product is owned by the currently logged-in Retailer (regardless of state, they own it)
    const isOwnedByRetailer = ownerLower === connectedLower;

    // Condition 2: Product is owned by the Wholesaler AND is in a state >= ShippedToWholesaler
    // This shows products in the pipeline coming towards the retailer.
    const isInWholesalerPipeline =
        ownerLower === wholesalerLower &&
        RETAILER_VISIBLE_STATES.includes(p.currentState); // Check if state is relevant

    // EXCLUDE products still in Harvested state (State 0), even if owned by the connected wallet (if user is also farmer)
    const isHarvested = p.currentState === 0; // State 0 is Harvested

    // Show if owned by retailer OR in wholesaler pipeline, BUT NOT if it's still Harvested
    return (isOwnedByRetailer || isInWholesalerPipeline) && !isHarvested;
  });


  return (
    // Wrap content in a React Fragment to include the button alongside the layout
     <>
      {/* Back to Home Button */}
      <button onClick={onLogout} className="back-button">
        &larr; Back to Home / Select Role
      </button>

      {/* Use a single-column layout */}
      <div className="main-layout-single animate-fade-in">
        <div className="card full-width">
          {/* Header for the Retailer view */}
          <h2><span role="img" aria-label="shopping-cart">🛒</span> Retailer Dashboard</h2>
          <p>View your current inventory and track products moving through the wholesaler stage towards your store.</p>

          {/* Display products visible to the retailer */}
          <Dashboard
            products={retailerVisibleProducts} // Pass the correctly filtered list
            loading={loading}
            currentRole="Retailer" // Pass the role for context (needed for button logic)
            connectedWallet={connectedWallet}
            // onAction prop will be implemented here later for "Receive Shipment" and "List for Sale"
          />

          {/* Placeholder section outlining future features */}
          <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h4>Retailer Actions (Future Implementation)</h4>
            <ul className="placeholder-list">
              <li>View incoming inventory (Products owned by Wholesaler with status 'ShippedToRetailer')</li>
              <li>Confirm receipt from wholesaler (Action button on Dashboard rows for owned products with status 'ShippedToRetailer')</li>
              <li>Manage stock levels and product details</li>
              <li>List products 'For Sale' (Action button to update state to 'ForSale' for owned products)</li>
              <li>View sales history</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default RetailerView;

