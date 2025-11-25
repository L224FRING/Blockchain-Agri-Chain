import React, { useState } from 'react';
import { ethers } from 'ethers';
import RatingBadge from './RatingBadge';
// Import the necessary mappings from the config file
import { STATE_MAPPING, ROLE_MANAGER_ABI, ROLE_MANAGER_ADDRESS, FOR_SALE_STATES, SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS } from './config';
import './App.css'; // For general styling
import StarRating from './StarRating';
import './expiry.css'; // For expiry date styling

// This is the Sepolia Etherscan URL for linking the hash
const ETHERSCAN_URL = "https://sepolia.etherscan.io/tx/";

// --- States where a product is for sale by a wholesaler ---
// We define this here so ProductActions can use it
const WHOLESALER_FOR_SALE_STATES = [
    2, // ReceivedByWholesaler
    3  // Processed
];

// --- Utility Functions (getExpiryInfo, formatPrice) ---
// (No changes to your existing utility functions)

const getExpiryInfo = (expiryTimestamp) => {
    if (!expiryTimestamp) return { text: 'N/A', className: '' };
    const nowSec = Math.floor(Date.now() / 1000);
    const expirySec = typeof expiryTimestamp === 'bigint' ? Number(expiryTimestamp) : Number(expiryTimestamp);
    const expiryDate = new Date(expirySec * 1000);
    const daysUntilExpiry = Math.floor((expirySec - nowSec) / (24 * 60 * 60));
    if (nowSec > expirySec) {
        return { text: 'EXPIRED', className: 'expiry-expired', fullDate: expiryDate.toLocaleDateString() };
    } else if (daysUntilExpiry <= 7) {
        return { text: `${daysUntilExpiry}d left`, className: 'expiry-warning', fullDate: expiryDate.toLocaleDateString() };
    } else {
        return { text: expiryDate.toLocaleDateString(), className: 'expiry-ok', fullDate: expiryDate.toLocaleDateString() };
    }
};

const formatPrice = (price) => {
    const PRICE_DECIMALS = 0; 
    if (typeof price === 'bigint') {
        try {
            const formatted = ethers.formatUnits(price, PRICE_DECIMALS);
            return `₹${Number(formatted).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
        } catch (e) {
            console.error("Error formatting price (BigInt issue):", e);
            return "N/A (Fmt Error)";
        }
    }
    return "N/A";
};



const ProductActions = ({ product, currentRole, connectedWallet, onAction, onSetPrice, onRate, loading }) => {
    
    // ... (state for farmer dropdown: username, wholesalers, etc.) ...
    const [markup, setMarkup] = useState('');
    const [username, setUsername] = React.useState('');
    const [wholesalers, setWholesalers] = React.useState([]);
    const [loadingWholesalers, setLoadingWholesalers] = React.useState(false);
    const [hasFetchedWholesalers, setHasFetchedWholesalers] = React.useState(false);

    const isOwner = product.owner.toLowerCase() === connectedWallet.toLowerCase();

    // Fetch wholesalers (by username) from RoleManager
    const fetchWholesalers = async () => {
        if (loadingWholesalers) return;
        setLoadingWholesalers(true);
        try {
            if (!window.ethereum) { setWholesalers([]); return; }
            const provider = new ethers.BrowserProvider(window.ethereum);
            // Prefer reading RoleManager address from SupplyChain to avoid mismatch
            let roleManagerAddr = ROLE_MANAGER_ADDRESS;
            try {
                const sc = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, provider);
                roleManagerAddr = await sc.roleManager();
            } catch (_) {}
            const roleManager = new ethers.Contract(roleManagerAddr, ROLE_MANAGER_ABI, provider);
            // Role enum: None=0, Farmer=1, Wholesaler=2, Retailer=3, Consumer=4
            const usernames = await roleManager.getUsernamesByRole(2);
            setWholesalers(Array.isArray(usernames) ? usernames : []);
            setHasFetchedWholesalers(true);
        } catch (e) {
            console.error('Failed to fetch wholesalers:', e);
            setWholesalers([]);
            setHasFetchedWholesalers(true);
        } finally {
            setLoadingWholesalers(false);
        }
    };
    React.useEffect(() => {
        if (currentRole === 'Farmer' && isOwner && product.currentState === 0 && !hasFetchedWholesalers) {
            fetchWholesalers();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentRole, isOwner, product.currentState, hasFetchedWholesalers]);


    // --- 1. Farmer Actions ---
    if (currentRole === 'Farmer' && isOwner) {
        if (product.currentState === 0) { // State 0: Harvested
            return (
                <div className="action-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label>Wholesaler Username:</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <select
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading || loadingWholesalers || wholesalers.length === 0}
                            style={{ padding: '6px 8px', fontSize: '0.95em' }}
                        >
                            <option value="">
                                {loadingWholesalers ? 'Loading wholesalers...' : 'Select a wholesaler'}
                            </option>
                            {wholesalers.map((u) => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="or type username manually"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{ padding: '6px 8px', fontSize: '0.9em' }}
                            disabled={loading}
                        />
                    </div>
                    <button
                        onClick={() => onAction(product.id, username.trim())}
                        className="button-action"
                        disabled={loading || !username.trim()}
                    >
                        Propose Transfer
                    </button>
                </div>
            );
        }
    }
    
    // --- 2. Wholesaler Actions ---
    if (currentRole === 'Wholesaler' && isOwner) {
        
        // Step 1: Confirm Receipt
        if (product.currentState === 1) { // 1 = ShippedToWholesaler
            return (
                <button
                    onClick={() => onAction(product.id)} // onAction is handleConfirmReceipt
                    className="button-action button-receive"
                    disabled={loading}
                >
                    Confirm Receipt
                </button>
            );
        }

        // Step 2: Rate Farmer & Set Price
        if (FOR_SALE_STATES.includes(product.currentState)) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* --- Rating UI --- */}
                    {!product.farmerRated ? (
                        <div className="action-box">
                            <label>Rate Farmer:</label>
                            <StarRating onRate={(score) => onRate(product.id, score)} loading={loading} />
                        </div>
                    ) : (
                        <span className="no-action-label">Farmer Rated ✔</span>
                    )}

                    {/* --- Set Price UI --- */}
                    <div className="action-box">
                        <label>Set Markup:</label>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                                type="number"
                                placeholder="Markup %"
                                value={markup}
                                onChange={(e) => setMarkup(e.target.value)}
                                style={{ width: '80px', padding: '6px 8px', fontSize: '0.9em' }}
                                disabled={loading}
                            />
                            <button
                                onClick={() => onSetPrice(product.id, markup)}
                                className="button-action button-set-price"
                                disabled={loading || !markup || Number(markup) <= 0}
                            >
                                Set Price
                            </button>
                        </div>
                    </div>

                </div>
            );
        }
    }

    // --- 3. Retailer Actions ---
    if (currentRole === 'Retailer') {
        
        // Action: Propose Purchase (in Marketplace - states 2 or 3, not owned)
        if (!isOwner && FOR_SALE_STATES.includes(product.currentState)) {
            return (
                <button
                    onClick={() => onAction(product.id, product.pricePerUnit)} // onAction is handleProposePurchase
                    className="button-action button-buy"
                    disabled={loading}
                >
                    Propose Purchase (Pay Now)
                </button>
            );
        }
        
        // Action: Confirm Receipt (state 4 - shipped to retailer)
        if (isOwner && product.currentState === 4) {
            return (
                <button
                    onClick={() => onAction(product.id)} // onAction is handleConfirmReceipt
                    className="button-action button-receive"
                    disabled={loading}
                >
                    Confirm Receipt
                </button>
            );
        }
        
        // Action: Rate Wholesaler & List for Sale (state 5 - received by retailer)
        if (isOwner && product.currentState === 5) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* --- Rating UI --- */}
                    {!product.wholesalerRated ? (
                        <div className="action-box">
                            <label>Rate Wholesaler:</label>
                            <StarRating onRate={(score) => onRate(product.id, score)} loading={loading} />
                        </div>
                    ) : (
                        <span className="no-action-label">Wholesaler Rated ✔</span>
                    )}

                    {/* --- List for Sale UI --- */}
                    <div className="action-box">
                        <label>Set Markup:</label>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                                type="number"
                                placeholder="Markup %"
                                value={markup}
                                onChange={(e) => setMarkup(e.target.value)}
                                style={{ width: '80px', padding: '6px 8px', fontSize: '0.9em' }}
                                disabled={loading}
                            />
                            <button
                                onClick={() => onSetPrice(product.id, markup)}
                                className="button-action button-set-price"
                                disabled={loading || !markup || Number(markup) <= 0}
                            >
                                List for Sale
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        
        // Action: Rate Wholesaler (states 6 or 7 - after listing/selling)
        if (isOwner && (product.currentState === 6 || product.currentState === 7)) {
            if (!product.wholesalerRated) {
                return (
                     <div className="action-box">
                        <label>Rate Wholesaler:</label>
                        <StarRating onRate={(score) => onRate(product.id, score)} loading={loading} />
                    </div>
                );
            } else {
                return <span className="no-action-label">Wholesaler Rated ✔</span>;
            }
        }
    }
    
    // --- 4. Consumer Actions ---
    if (currentRole === 'Consumer') {
        
        // Action: Buy Product (in Marketplace - state 6, not owned)
        if (!isOwner && product.currentState === 6) {
            return (
                <button
                    onClick={() => onAction(product.id, product.pricePerUnit)} // onAction is handleBuyProduct
                    className="button-action button-buy"
                    disabled={loading}
                >
                    Buy Now
                </button>
            );
        }
        
        // Action: Rate Retailer (state 7 - purchased)
        if (isOwner && product.currentState === 7 && !product.retailerRated) {
            return (
                <div className="action-box">
                    <label>Rate Retailer:</label>
                    <StarRating onRate={(score) => onRate(product.id, score)} loading={loading} />
                </div>
            );
        }
        
        // Show rated status
        if (isOwner && product.currentState === 7 && product.retailerRated) {
            return <span className="no-action-label">Retailer Rated ✔</span>;
        }
    }
    
    // --- Fallback ---
    if (isOwner) {
         return <span className="no-action-label">No action</span>;
    }
    return <span className="no-action-label">Not owner</span>;
};


// --- Dashboard Component (Main) ---
// We must add the `onSetPrice` prop
function Dashboard({ products, loading, currentRole, connectedWallet, onAction, onSetPrice, onRate ,onViewHistory}) {

    if (loading) return (
        <div className="loading-container">
            <span className="spinner"></span>
            <p>Loading products...</p>
        </div>
    );

    if (products.length === 0) {
        return <p className="no-products">No products found for this view.</p>;
    }

    return (
        <div className="dashboard">
            <div className="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name & Origin</th>
                            <th>Qty / Unit</th>
                            <th>Price / Unit</th>
                            <th>Expiry</th>
                            <th>Status</th>
                            <th>Proof (Hash)</th>
                            {/* Actions column shows for everyone now, but content differs */}
                            <th>Actions</th>
                            <th>History</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td>{Number(product.id)}</td>
                                <td>
                                    <strong>{product.name}</strong>
                                    <br />
                                    <span style={{ fontSize: '0.9em', color: 'var(--subtle-text-color)' }}>
                                        From: {product.origin}
                                    </span>
                                    <br />
                                    <span style={{ fontSize: '0.85em', color: 'var(--subtle-text-color)' }}>
                                        <RatingBadge userAddress={product.farmer} label="Farmer" />
                                        {product.wholesaler && (
                                            <>
                                                {' · '}
                                                <RatingBadge userAddress={product.wholesaler} label="Wholesaler" />
                                            </>
                                        )}
                                        {product.retailer && (
                                            <>
                                                {' · '}
                                                <RatingBadge userAddress={product.retailer} label="Retailer" />
                                            </>
                                        )}
                                    </span>
                                </td>
                                <td>
                                    {Number(product.quantity).toLocaleString()} {product.unit}
                                </td>
                                <td>{formatPrice(product.pricePerUnit)}</td>
                                <td>
                                    {(() => {
                                        const expiryInfo = getExpiryInfo(product.expiryDate);
                                        return (
                                            <span 
                                                className={`expiry-badge ${expiryInfo.className}`}
                                                title={`Full Date: ${expiryInfo.fullDate}`}
                                            >
                                                {expiryInfo.text}
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td>
                                    <span className={`state-badge state-${product.currentState}`}>
                                        {STATE_MAPPING[product.currentState] || 'Unknown'}
                                    </span>
                                </td>
                                <td>
                                    {product.txHash ? (
                                        <a 
                                            href={`${ETHERSCAN_URL}${product.txHash}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="etherscan-link"
                                        >
                                            {`${product.txHash.substring(0, 10)}...`}
                                            <span className="external-link-icon">↗</span>
                                        </a>
                                    ) : (
                                        <span className="no-hash">No Hash</span>
                                    )}
                                </td>
                                <td>
                                    <ProductActions 
                                        product={product} 
                                        currentRole={currentRole} 
                                        connectedWallet={connectedWallet} 
                                        onAction={onAction}
                                        onSetPrice={onSetPrice} // Pass the new prop down
                                        onRate={onRate}
                                        loading={loading}
                                    />
                                </td>
                                <td>
                                    <button 
                                        className="button-history"
                                        onClick={() => onViewHistory(product)}
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Dashboard;
