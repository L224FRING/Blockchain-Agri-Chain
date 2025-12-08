import React from 'react';
import './SortDropdown.css';

/**
 * Dropdown for sorting products
 */
const SortDropdown = ({ value, onChange }) => {
  const sortOptions = [
    { value: 'date-desc', label: '📅 Newest First' },
    { value: 'date-asc', label: '📅 Oldest First' },
    { value: 'price-asc', label: '💰 Price: Low to High' },
    { value: 'price-desc', label: '💰 Price: High to Low' },
    { value: 'name-asc', label: '🔤 Name: A to Z' },
    { value: 'name-desc', label: '🔤 Name: Z to A' },
    { value: 'expiry-asc', label: '⏰ Expiring Soon' },
    { value: 'expiry-desc', label: '⏰ Expiring Last' }
  ];

  return (
    <div className="sort-dropdown-container">
      <label htmlFor="sort-select" className="sort-label">
        Sort by:
      </label>
      <select
        id="sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sort-select"
      >
        {sortOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SortDropdown;
