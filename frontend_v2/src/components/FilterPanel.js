import React, { useState } from 'react';
import { STATE_MAPPING } from '../config';
import './FilterPanel.css';

/**
 * Comprehensive filter panel for products
 * Includes state, price, expiry, and date filters
 */
const FilterPanel = ({ filters, setFilters, onClear, hasActiveFilters }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleState = (state) => {
    setFilters(prev => ({
      ...prev,
      states: prev.states.includes(state)
        ? prev.states.filter(s => s !== state)
        : [...prev.states, state]
    }));
  };

  const updatePriceRange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [type]: value === '' ? (type === 'min' ? 0 : Infinity) : Number(value)
      }
    }));
  };

  return (
    <div className={`filter-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="filter-header">
        <div className="filter-title-section">
          <h3>
            <span className="filter-icon">🔧</span>
            Filters
            {hasActiveFilters && <span className="active-indicator">●</span>}
          </h3>
          <button 
            className="toggle-filters-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
          >
            {isExpanded ? '▲ Hide' : '▼ Show'}
          </button>
        </div>
        {hasActiveFilters && (
          <button onClick={onClear} className="clear-filters-btn">
            ✕ Clear All
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="filter-content">
          {/* State Filter */}
          <div className="filter-section">
            <h4>📦 Product State</h4>
            <div className="filter-checkboxes">
              {Object.entries(STATE_MAPPING).map(([stateNum, stateName]) => (
                <label key={stateNum} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.states.includes(Number(stateNum))}
                    onChange={() => toggleState(Number(stateNum))}
                  />
                  <span>{stateName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="filter-section">
            <h4>💰 Price Range (₹)</h4>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceRange.min === 0 ? '' : filters.priceRange.min}
                onChange={(e) => updatePriceRange('min', e.target.value)}
                className="price-input"
                min="0"
              />
              <span className="price-separator">to</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.priceRange.max === Infinity ? '' : filters.priceRange.max}
                onChange={(e) => updatePriceRange('max', e.target.value)}
                className="price-input"
                min="0"
              />
            </div>
          </div>

          {/* Expiry Status Filter */}
          <div className="filter-section">
            <h4>📅 Expiry Status</h4>
            <select
              value={filters.expiryStatus}
              onChange={(e) => updateFilter('expiryStatus', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Products</option>
              <option value="fresh">🟢 Fresh (3+ days)</option>
              <option value="expiring">🟡 Expiring Soon (≤3 days)</option>
              <option value="expired">🔴 Expired</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
