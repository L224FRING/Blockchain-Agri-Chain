import React from 'react';
import Dashboard from './Dashboard'; // Re-use the Dashboard component
import './App.css'; // Re-use App.css for styling

// This component receives data and functions as props from App.js
function ConsumerView({ products, loading, connectedWallet, onLogout }) {

  // --- Filtering Logic (Example) ---
  // A consumer typically views products marked 'ForSale' (State 6) or all products for verification.
  const consumerProducts = products; // Show all products to maximize traceability demo

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
          {/* Header for the Consumer view */}
          <h2><span role="img" aria-label="person">🧍</span> Marketplace / Product Verification</h2>
          <p>View products tracked on the AgriChain platform and verify their complete journey from farm to shelf using blockchain data.</p>

          {/* Display all products (or filtered list) for verification */}
          <Dashboard
            products={consumerProducts}
            loading={loading}
            currentRole="Consumer" // Pass the role for context
            connectedWallet={connectedWallet} // Pass wallet, though consumer actions might not require signing
            // onAction prop is not typically needed for consumers, but keeping it available
          />

           {/* Placeholder section outlining future features */}
          <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h4>Consumer Actions (Traceability & Verification)</h4>
            <ul className="placeholder-list">
              <li>Browse all products tracked on the chain</li>
              <li>Click on a product row to view its detailed, step-by-step history (Provenance Page)</li>
              <li>Verify authenticity and origin information stored immutably</li>
              <li>(Optional) Simulate purchasing a product marked 'ForSale'</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default ConsumerView;
