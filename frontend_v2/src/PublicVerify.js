import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useParams } from 'react-router-dom';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS, STATE_MAPPING } from './config';
import './PublicVerify.css';

/**
 * Public verification page - no wallet required
 * Accessible via QR code scan
 */
const PublicVerify = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use public RPC provider (no wallet needed)
        const provider = new ethers.JsonRpcProvider(
          'https://eth-sepolia.g.alchemy.com/v2/demo' // Public demo endpoint
        );

        const contract = new ethers.Contract(
          SUPPLY_CHAIN_ADDRESS,
          SUPPLY_CHAIN_ABI,
          provider
        );

        const productData = await contract.getProductById(productId);

        setProduct({
          id: Number(productData.id),
          name: productData.name,
          origin: productData.origin,
          owner: productData.owner,
          farmer: productData.farmer,
          wholesaler: productData.wholesaler,
          retailer: productData.retailer,
          txHash: productData.transactionHash,
          quantity: Number(productData.quantity),
          unit: productData.unit,
          pricePerUnit: productData.pricePerUnit,
          currentState: Number(productData.currentState),
          expiryDate: Number(productData.expiryDate),
          creationTimestamp: Number(productData.creationTimestamp)
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Product not found or network error');
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAddress = (address) => {
    if (!address || address === ethers.ZeroAddress) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="verify-container">
        <div className="verify-loading">
          <div className="spinner-large"></div>
          <p>Loading product information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verify-container">
        <div className="verify-error">
          <div className="error-icon">❌</div>
          <h2>Product Not Found</h2>
          <p>{error}</p>
          <a href="/" className="verify-home-link">← Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-container">
      <div className="verify-header">
        <h1>🌱 AgriChain Product Verification</h1>
        <p>Blockchain-verified supply chain information</p>
      </div>

      <div className="verify-content">
        {/* Product Info Card */}
        <div className="verify-card">
          <div className="verify-card-header">
            <h2>📦 Product Information</h2>
            <span className="verify-badge">✓ Verified</span>
          </div>
          <div className="verify-card-body">
            <div className="verify-info-row">
              <span className="verify-label">Product ID:</span>
              <span className="verify-value">#{product.id}</span>
            </div>
            <div className="verify-info-row">
              <span className="verify-label">Name:</span>
              <span className="verify-value">{product.name}</span>
            </div>
            <div className="verify-info-row">
              <span className="verify-label">Origin:</span>
              <span className="verify-value">{product.origin}</span>
            </div>
            <div className="verify-info-row">
              <span className="verify-label">Quantity:</span>
              <span className="verify-value">{product.quantity} {product.unit}</span>
            </div>
            <div className="verify-info-row">
              <span className="verify-label">Current State:</span>
              <span className={`verify-state state-${product.currentState}`}>
                {STATE_MAPPING[product.currentState]}
              </span>
            </div>
            <div className="verify-info-row">
              <span className="verify-label">Expiry Date:</span>
              <span className="verify-value">{formatDate(product.expiryDate)}</span>
            </div>
            <div className="verify-info-row">
              <span className="verify-label">Created:</span>
              <span className="verify-value">{formatDate(product.creationTimestamp)}</span>
            </div>
          </div>
        </div>

        {/* Supply Chain Journey */}
        <div className="verify-card">
          <div className="verify-card-header">
            <h2>🚚 Supply Chain Journey</h2>
          </div>
          <div className="verify-card-body">
            <div className="verify-journey">
              <div className="journey-step">
                <div className="journey-icon">👨‍🌾</div>
                <div className="journey-info">
                  <h3>Farmer</h3>
                  <p>{formatAddress(product.farmer)}</p>
                  <a
                    href={`https://sepolia.etherscan.io/address/${product.farmer}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="journey-link"
                  >
                    View on Etherscan →
                  </a>
                </div>
              </div>

              {product.wholesaler && product.wholesaler !== ethers.ZeroAddress && (
                <>
                  <div className="journey-arrow">↓</div>
                  <div className="journey-step">
                    <div className="journey-icon">🏭</div>
                    <div className="journey-info">
                      <h3>Wholesaler</h3>
                      <p>{formatAddress(product.wholesaler)}</p>
                      <a
                        href={`https://sepolia.etherscan.io/address/${product.wholesaler}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="journey-link"
                      >
                        View on Etherscan →
                      </a>
                    </div>
                  </div>
                </>
              )}

              {product.retailer && product.retailer !== ethers.ZeroAddress && (
                <>
                  <div className="journey-arrow">↓</div>
                  <div className="journey-step">
                    <div className="journey-icon">🏬</div>
                    <div className="journey-info">
                      <h3>Retailer</h3>
                      <p>{formatAddress(product.retailer)}</p>
                      <a
                        href={`https://sepolia.etherscan.io/address/${product.retailer}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="journey-link"
                      >
                        View on Etherscan →
                      </a>
                    </div>
                  </div>
                </>
              )}

              {product.currentState === 7 && (
                <>
                  <div className="journey-arrow">↓</div>
                  <div className="journey-step">
                    <div className="journey-icon">🛒</div>
                    <div className="journey-info">
                      <h3>Consumer</h3>
                      <p>Sold to consumer</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Blockchain Verification */}
        <div className="verify-card">
          <div className="verify-card-header">
            <h2>🔐 Blockchain Verification</h2>
          </div>
          <div className="verify-card-body">
            <p className="verify-blockchain-info">
              This product information is stored on the Ethereum blockchain and cannot be tampered with.
              All transactions are publicly verifiable.
            </p>
            <div className="verify-blockchain-links">
              <a
                href={`https://sepolia.etherscan.io/address/${SUPPLY_CHAIN_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="verify-blockchain-link"
              >
                📜 View Smart Contract
              </a>
              <a
                href={`https://sepolia.etherscan.io/address/${product.owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="verify-blockchain-link"
              >
                👤 View Current Owner
              </a>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="verify-cta">
          <h3>Want to track your own products?</h3>
          <p>Join AgriChain to manage your supply chain on the blockchain</p>
          <a href="/" className="verify-cta-button">Get Started →</a>
        </div>
      </div>

      <div className="verify-footer">
        <p>Powered by AgriChain | Ethereum Sepolia Testnet</p>
      </div>
    </div>
  );
};

export default PublicVerify;
