import React from 'react';
import { ethers } from 'ethers';
// Import the necessary mappings from the config file
import { STATE_MAPPING, ROLE_MANAGER_ABI, ROLE_MANAGER_ADDRESS } from './config'; 
import './App.css'; // For general styling
import './expiry.css'; // For expiry date styling

// This is the Sepolia Etherscan URL for linking the hash
const ETHERSCAN_URL = "https://sepolia.etherscan.io/tx/";

// Utility function to format expiry date and get status
const getExpiryInfo = (expiryTimestamp) => {
    if (!expiryTimestamp) return { text: 'N/A', className: '' };
    
    const now = Math.floor(Date.now() / 1000);
    const expiryDate = new Date(Number(expiryTimestamp) * 1000);
    const daysUntilExpiry = Math.floor((expiryTimestamp - now) / (24 * 60 * 60));
    
    if (now > expiryTimestamp) {
        return {
            text: 'EXPIRED',
            className: 'expiry-expired',
            fullDate: expiryDate.toLocaleDateString()
        };
    } else if (daysUntilExpiry <= 7) {
        return {
            text: `${daysUntilExpiry}d left`,
            className: 'expiry-warning',
            fullDate: expiryDate.toLocaleDateString()
        };
    } else {
        return {
            text: expiryDate.toLocaleDateString(),
            className: 'expiry-ok',
            fullDate: expiryDate.toLocaleDateString()
        };
    }
};

// Utility function to format price
const formatPrice = (price) => {
    // Assuming price is stored as a whole number (no decimals in contract)
    const PRICE_DECIMALS = 0; 
    
    // Check if price is a BigInt (modern ethers.js return type)
    if (typeof price === 'bigint') {
        // Safely convert BigInt to string before passing to formatUnits
        try {
            const formatted = ethers.formatUnits(price, PRICE_DECIMALS);
            // Use local string formatting for currency display
            return `₹${Number(formatted).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
        } catch (e) {
            console.error("Error formatting price (BigInt issue):", e);
            return "N/A (Fmt Error)";
        }
    }
    // Handle cases where the value might be null or zero
    return "N/A";
};

// Component to handle action buttons (Phase 2 core logic)
// Added onAction prop
const ProductActions = ({ product, currentRole, connectedWallet, onAction, loading }) => {
    // local hook state for inputs (must be at top-level of component)
    const [username, setUsername] = React.useState('');
    const [wholesalers, setWholesalers] = React.useState([]);
    const [loadingWholesalers, setLoadingWholesalers] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);

    // Current owner should be the connected wallet
    const isOwner = product.owner.toLowerCase() === connectedWallet.toLowerCase();

    // Fetch available wholesalers when dropdown opens
    React.useEffect(() => {
        if (currentRole === 'Farmer' && isOwner && product.currentState === 0 && dropdownOpen && wholesalers.length === 0) {
            fetchWholesalers();
        }
    }, [dropdownOpen, currentRole, isOwner, product.currentState, wholesalers.length]);

    const fetchWholesalers = async () => {
        setLoadingWholesalers(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const roleManagerContract = new ethers.Contract(ROLE_MANAGER_ADDRESS, ROLE_MANAGER_ABI, provider);
            
            // Fetch RoleAssigned events where role is Wholesaler (role index 2)
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);
            
            // Create a filter for RoleAssigned events (Wholesaler role = 2)
            const eventTopic = ethers.id('RoleAssigned(address,uint8,string)');
            const wholesalerRole = 2; // Wholesaler enum value
            
            const logs = await provider.getLogs({
                address: ROLE_MANAGER_ADDRESS,
                topics: [eventTopic],
                fromBlock: fromBlock,
                toBlock: 'latest'
            });
            
            // Parse logs to extract usernames
            const usernamesSet = new Set();
            for (const log of logs) {
                try {
                    const parsed = roleManagerContract.interface.parseLog(log);
                    if (parsed && parsed.args && parsed.args.role === wholesalerRole) {
                        usernamesSet.add(parsed.args.username);
                    }
                } catch (e) {
                    console.warn('Error parsing log:', e);
                }
            }
            
            const wholesalerList = Array.from(usernamesSet).sort();
            setWholesalers(wholesalerList);
            
            if (wholesalerList.length === 0) {
                console.warn('No registered wholesalers found in the last 10000 blocks');
            }
        } catch (error) {
            console.error('Error fetching wholesalers:', error);
            setWholesalers([]);
        } finally {
            setLoadingWholesalers(false);
        }
    };
    
    // --- Farmer Actions ---
    if (currentRole === 'Farmer' && isOwner) {
        if (product.currentState === 0) { // State 0: Harvested
            return (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', position: 'relative' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '120px' }}>
                        <button
                            onClick={() => {
                                setDropdownOpen(!dropdownOpen);
                                if (!dropdownOpen && wholesalers.length === 0) {
                                    fetchWholesalers();
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                textAlign: 'left',
                                backgroundColor: '#fff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.9em'
                            }}
                            disabled={loading}
                        >
                            <span>{username || 'Select wholesaler'}</span>
                            <span>{dropdownOpen ? '▲' : '▼'}</span>
                        </button>
                        {dropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: '#fff',
                                border: '1px solid var(--border-color)',
                                borderTop: 'none',
                                borderRadius: '0 0 4px 4px',
                                zIndex: 1000,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}>
                                {loadingWholesalers ? (
                                    <div style={{ padding: '10px', textAlign: 'center', color: '#666', fontSize: '0.9em' }}>
                                        Loading...
                                    </div>
                                ) : wholesalers.length > 0 ? (
                                    wholesalers.map(w => (
                                        <div
                                            key={w}
                                            onClick={() => {
                                                setUsername(w);
                                                setDropdownOpen(false);
                                            }}
                                            style={{
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                backgroundColor: username === w ? '#e8f4f8' : '#fff',
                                                borderBottom: '1px solid #eee',
                                                fontSize: '0.9em'
                                            }}
                                            onMouseEnter={e => e.target.style.backgroundColor = '#f0f0f0'}
                                            onMouseLeave={e => e.target.style.backgroundColor = username === w ? '#e8f4f8' : '#fff'}
                                        >
                                            {w}
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '10px', textAlign: 'center', color: '#999', fontSize: '0.9em' }}>
                                        No wholesalers
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => onAction(product.id, username.trim())}
                        className="button-action button-ship"
                        disabled={loading || !username.trim()}
                        title="Propose transfer to wholesaler by username"
                    >
                        Propose Transfer
                    </button>
                </div>
            );
        }
    }
    
    // --- Wholesaler Actions ---
     if (currentRole === 'Wholesaler' && isOwner) {
        if (product.currentState === 1) { // State 1: Shipped To Wholesaler
            return (
                <button 
                    onClick={() => onAction(product.id)} // Calls the confirmReceipt function
                    className="button-action button-receive"
                    disabled={loading}
                >
                    Confirm Receipt
                </button>
            );
        }
    }
    
    // If no action is available or required
    if (currentRole === 'Consumer') {
         return <span className="no-action-label">View History</span>;
    }

    // Return current state label if no actions are available but the product is still owned
    if (isOwner) {
         return <span className="no-action-label">Status OK</span>;
    }

    return <span className="no-action-label">No actions available</span>;
};


// Dashboard Component
function Dashboard({ products, loading, currentRole, connectedWallet, onAction }) {

    // --- Loading State ---
    if (loading) return (
        <div className="loading-container">
            <span className="spinner"></span> 
            <p>Fetching {currentRole} products from the blockchain...</p>
        </div>
    );

    // --- Empty State ---
    if (products.length === 0) {
        return <p className="no-products">No products found under your role's ownership or filter.</p>;
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
                            {/* Only show Actions column for Farmer/Wholesaler */}
                            {(currentRole === 'Farmer' || currentRole === 'Wholesaler') && (
                                <th>Actions</th>
                            )}
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
                                </td>
                                <td>
                                    {/* FIX: Format Quantity (which is a Number after conversion in App.js) */}
                                    {Number(product.quantity).toLocaleString()} {product.unit}
                                </td>
                                <td>{formatPrice(product.pricePerUnit)}</td>
                                <td>
                                    {/* Display Expiry Date with status indicator */}
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
                                    {/* Display State from mapping, ensuring product.currentState is a valid key (Number) */}
                                    <span className={`state-badge state-${product.currentState}`}>
                                        {STATE_MAPPING[product.currentState] || 'Unknown'}
                                    </span>
                                </td>
                                <td>
                                    {/* Link the initial transaction hash */}
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
                                {/* Actions Column */}
                                {(currentRole === 'Farmer' || currentRole === 'Wholesaler') && (
                                    <td>
                                        <ProductActions 
                                            product={product} 
                                            currentRole={currentRole} 
                                            connectedWallet={connectedWallet} 
                                            onAction={onAction} // Passed the action function
                                            loading={loading} // Passed loading state
                                        />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Dashboard;
