import React, { useState, useEffect } from 'react';
import './SearchBar.css';

/**
 * Search bar component with debounced input
 * Delays the actual search to avoid excessive filtering
 */
const SearchBar = ({ value, onChange, placeholder = "Search products by name, origin, or ID..." }) => {
  const [localValue, setLocalValue] = useState(value);

  // Debounce search input - wait 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="search-bar">
      <span className="search-icon" aria-hidden="true">🔍</span>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="search-input"
        aria-label="Search products"
      />
      {localValue && (
        <button 
          className="clear-search"
          onClick={() => setLocalValue('')}
          aria-label="Clear search"
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchBar;
