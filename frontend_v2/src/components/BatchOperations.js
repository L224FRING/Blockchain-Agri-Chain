import React, { useState } from 'react';
import './BatchOperations.css';

const BatchOperations = ({ products, onBatchAction, availableActions, role }) => {
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showBatchPanel, setShowBatchPanel] = useState(false);

  const toggleProduct = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const handleBatchAction = async (action) => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product');
      return;
    }

    const selectedProductsList = products.filter(p => selectedProducts.has(p.id));
    
    if (window.confirm(`Perform "${action}" on ${selectedProducts.size} product(s)?`)) {
      await onBatchAction(action, selectedProductsList);
      clearSelection();
    }
  };

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="batch-operations">
      {/* Toggle Button */}
      <button 
        className="batch-toggle-btn"
        onClick={() => setShowBatchPanel(!showBatchPanel)}
      >
        {showBatchPanel ? '✕ Close' : '☑️ Batch Select'}
      </button>

      {/* Batch Panel */}
      {showBatchPanel && (
        <div className="batch-panel">
          <div className="batch-header">
            <div className="batch-info">
              <span className="batch-count">
                {selectedProducts.size} of {products.length} selected
              </span>
            </div>
            
            <div className="batch-controls">
              <button 
                className="batch-btn batch-btn-secondary"
                onClick={selectAll}
              >
                {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedProducts.size > 0 && (
                <button 
                  className="batch-btn batch-btn-secondary"
                  onClick={clearSelection}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Batch Actions */}
          {selectedProducts.size > 0 && availableActions && availableActions.length > 0 && (
            <div className="batch-actions">
              <span className="batch-actions-label">Actions:</span>
              {availableActions.map(action => (
                <button
                  key={action.id}
                  className={`batch-btn batch-btn-action ${action.className || ''}`}
                  onClick={() => handleBatchAction(action.id)}
                  disabled={action.disabled}
                >
                  {action.icon} {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Selection Checkboxes */}
          <div className="batch-selection-list">
            {products.map(product => (
              <label key={product.id} className="batch-checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedProducts.has(product.id)}
                  onChange={() => toggleProduct(product.id)}
                />
                <span className="batch-product-info">
                  <strong>#{product.id}</strong> - {product.name} 
                  <span className="batch-product-meta">
                    ({product.quantity} kg, ₹{product.price})
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchOperations;
