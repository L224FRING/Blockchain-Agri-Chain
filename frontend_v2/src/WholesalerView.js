import React, { useState } from 'react';
import { ethers } from 'ethers';
import Dashboard from './Dashboard';
// Use AUTHORIZED_ADDRESSES to get the Wholesaler placeholder address
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS, AUTHORIZED_ADDRESSES } from './config'; 
import './App.css'; 

// Enum values must match the contract 
const RECEIVED_BY_WHOLESALER_STATE = 2;
const SHIPPED_TO_WHOLESALER_STATE = 1;

function WholesalerView({ products, loading, connectedWallet, fetchProducts, onLogout }) {
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    // Get the address this component expects to act as (the placeholder address)
    // CRITICAL: Ensure we use the lowercase placeholder address for filtering
    const WHOSESALER_ROLE_ADDRESS = (AUTHORIZED_ADDRESSES.Wholesaler && AUTHORIZED_ADDRESSES.Wholesaler[0].toLowerCase()) || '';
    
    // --- Filtering Logic FIX ---
    // Show products owned by the placeholder Wholesaler address 
    // AND that are in the 'ShippedToWholesaler' state (ready to be received).
    const receivableProducts = products.filter(
        p => 
            // Product's owner must match the placeholder address
            p.owner.toLowerCase() === WHOSESALER_ROLE_ADDRESS &&
            // AND the product must be in the 'Shipped' state
            p.currentState === SHIPPED_TO_WHOLESALER_STATE
    );

    // --- Core Wholesaler Action: Confirm Receipt ---
    const confirmReceipt = async (productId) => {
        // Since we are simulating identity, the connected wallet is signing the transaction 
        // to update the state of a product owned by the Placeholder Address.
        // The contract's onlyOwner modifier still verifies the current owner (the placeholder address).
        // For the contract's onlyOwner modifier to pass, the connectedWallet (msg.sender) MUST be the WHOSESALER_ROLE_ADDRESS.
        
        if (connectedWallet.toLowerCase() !== WHOSESALER_ROLE_ADDRESS) {
             return setActionMessage("Error: Please log in with the exact Wholesaler Placeholder wallet address to perform this action.");
        }
        
        if (!window.ethereum) return setActionMessage("Error: MetaMask not found.");
        
        setActionLoading(true);
        setActionMessage(`Confirming receipt for Product ID ${productId}...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            setActionMessage(`Checking for pending transfer proposal for Product ${productId}...`);

            // Check if there's a pending transfer proposal for this product
            let proposal = null;
            try {
                proposal = await contract.transferProposals(productId);
            } catch (e) {
                console.warn('Could not read transferProposals:', e);
            }

            const targetAddress = proposal && proposal.target ? proposal.target.toLowerCase() : null;
            const wholesalerMatches = targetAddress && (targetAddress === connectedWallet.toLowerCase());

            // If there's a matching proposal that hasn't been executed and wholesaler hasn't confirmed, call wholesalerConfirmTransfer
            if (proposal && wholesalerMatches && !proposal.wholesalerConfirmed && !proposal.executed) {
                setActionMessage('Found pending proposal. Sending confirmation to accept transfer...');
                const tx = await contract.wholesalerConfirmTransfer(productId);
                setActionMessage('Confirmation transaction sent. Waiting for confirmation...');
                await tx.wait();
                setActionMessage(`✅ Success! Transfer for Product ${productId} accepted and executed.`);
                fetchProducts();
            } else {
                // Fallback: update state to RECEIVED_BY_WHOLESALER as before
                setActionMessage(`No pending proposal found — updating state to 'Received' (Product ${productId})...`);
                const tx = await contract.updateProductState(productId, RECEIVED_BY_WHOLESALER_STATE);
                setActionMessage('Transaction submitted. Waiting for confirmation...');
                await tx.wait();
                setActionMessage(`✅ Success! Product ${productId} received. Status updated.`);
                fetchProducts();
            }

        } catch (error) {
            console.error("Wholesaler Action Error:", error);
            if (error.code === 4001) {
                setActionMessage('Error: Transaction rejected by user.');
            } else if (error.message && error.message.includes("Only the current owner")) {
                 setActionMessage(`Error: Authorization Failed. Connected wallet is not the current product owner.`);
            } else {
                 setActionMessage(`Error performing wholesaler action. Check console.`);
            }
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <>
            <button onClick={onLogout} className="back-button">
                &larr; Back to Home / Select Role
            </button>

            <div className="main-layout-single animate-fade-in">
                <div className="card full-width">
                    <h2><span role="img" aria-label="factory">🏭</span> Wholesaler Dashboard</h2>
                    <p>
                        Current Wholesaler Role Address: <code>{WHOSESALER_ROLE_ADDRESS}</code>
                    </p>
                    
                    {actionMessage && (
                         <p className={`message ${actionMessage.startsWith('✅') ? 'message-success' : 'message-error'}`}>
                             {actionMessage}
                         </p>
                    )}

                    {/* Dashboard component, showing only receivable products */}
                    <Dashboard
                        products={receivableProducts}
                        loading={loading || actionLoading} // Disable dashboard while any action is pending
                        currentRole="Wholesaler"
                        connectedWallet={connectedWallet}
                        onAction={confirmReceipt} 
                    />

                    <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <h4>Wholesaler Pipeline (Future Steps)</h4>
                        <ul className="placeholder-list">
                            <li>Process/Package products (State 3)</li>
                            <li>Initiate shipment to retailer (State 4 + Transfer Ownership)</li>
                            <li>*Currently only 'Confirm Receipt' is implemented.*</li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
}

export default WholesalerView;
