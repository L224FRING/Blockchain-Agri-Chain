import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS, STATE_MAPPING } from './config';
import './ProductHistoryModal.css';

// Helper to format price (simplified from Dashboard's)
const formatPrice = (price) => {
    if (typeof price === 'bigint') {
        return `₹${ethers.formatUnits(price, 0)}`;
    }
    return "N/A";
};

// Helper to format an address
const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

function ProductHistoryModal({ product, onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchHistory = useCallback(async () => {
        if (!product) return;
        setLoading(true);
        setError('');

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, provider);
            
            let combinedHistory = [];

            // 1. Get Product Creation Event (Farmer's Price)
            const addedFilter = contract.filters.ProductAdded(product.id);
            const addedLogs = await contract.queryFilter(addedFilter, 0, 'latest');

            if (addedLogs.length > 0) {
                const log = addedLogs[0];
                const block = await log.getBlock();
                const parsed = contract.interface.parseLog(log);
                
                combinedHistory.push({
                    timestamp: block.timestamp,
                    txHash: log.transactionHash,
                    type: 'Creation',
                    title: `Product Added by Farmer`,
                    description: `Initial Price: ${formatPrice(parsed.args.pricePerUnit)}`,
                    by: parsed.args.owner,
                });
            }

            // 2. Get All Price Update Events
            const priceFilter = contract.filters.PriceUpdated(product.id);
            const priceLogs = await contract.queryFilter(priceFilter, 0, 'latest');

            for (const log of priceLogs) {
                const block = await log.getBlock();
                const parsed = contract.interface.parseLog(log);
                combinedHistory.push({
                    timestamp: block.timestamp,
                    txHash: log.transactionHash,
                    type: 'Price',
                    title: `Price Updated by Wholesaler`,
                    description: `New Price: ${formatPrice(parsed.args.newPrice)} (Old: ${formatPrice(parsed.args.oldPrice)})`,
                    by: parsed.args.by,
                });
            }

            // 3. Get All State Change Events
            const stateFilter = contract.filters.ProductStateUpdated(product.id);
            const stateLogs = await contract.queryFilter(stateFilter, 0, 'latest');

            for (const log of stateLogs) {
                const block = await log.getBlock();
                const parsed = contract.interface.parseLog(log);
                combinedHistory.push({
                    timestamp: block.timestamp,
                    txHash: log.transactionHash,
                    type: 'State',
                    title: `State Changed to: ${STATE_MAPPING[parsed.args.newState] || 'Unknown'}`,
                    description: `Previous State: ${STATE_MAPPING[parsed.args.oldState] || 'Unknown'}`,
                    by: parsed.args.stakeholder,
                });
            }
            
            // 4. Get All Ownership Transfers
            const transferFilter = contract.filters.OwnershipTransferred(product.id);
            const transferLogs = await contract.queryFilter(transferFilter, 0, 'latest');
            for (const log of transferLogs) {
                 const block = await log.getBlock();
                 const parsed = contract.interface.parseLog(log);
                 combinedHistory.push({
                    timestamp: block.timestamp,
                    txHash: log.transactionHash,
                    type: 'Owner',
                    title: `Ownership Transferred`,
                    description: `From: ${formatAddress(parsed.args.from)} To: ${formatAddress(parsed.args.to)}`,
                    by: parsed.args.to, // The new owner triggered this (implicitly)
                 });
            }


            // Sort all events by timestamp to create a final timeline
            combinedHistory.sort((a, b) => a.timestamp - b.timestamp);

            setHistory(combinedHistory);

        } catch (err) {
            console.error("Failed to fetch history:", err);
            setError("Could not load product history.");
        } finally {
            setLoading(false);
        }
    }, [product]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                <h2>Product History (ID: {product.id})</h2>
                <h3>{product.name}</h3>
                
                {loading && <div className="loading-container"><span className="spinner"></span><p>Loading history...</p></div>}
                {error && <p className="message message-error">{error}</p>}
                
                <div className="history-timeline">
                    {history.length === 0 && !loading && <p>No history found for this product.</p>}
                    
                    {history.map((item, index) => (
                        <div key={index} className={`timeline-item ${item.type.toLowerCase()}`}>
                            <div className="timeline-dot"></div>
                            <div className="timeline-content">
                                <span className="timeline-date">
                                    {new Date(item.timestamp * 1000).toLocaleString()}
                                </span>
                                <strong className="timeline-title">{item.title}</strong>
                                <p className="timeline-desc">{item.description}</p>
                                <div className="timeline-footer">
                                    <span>By: {formatAddress(item.by)}</span>
                                    <a href={`https://sepolia.etherscan.io/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer">
                                        View Tx ↗
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ProductHistoryModal;
