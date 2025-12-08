import React from 'react';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import SortDropdown from './SortDropdown';
import './FilterControls.css';

/**
 * Combined component for all filter controls
 * Includes search, filters, sort, and results count
 */
const FilterControls = ({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  sortBy,
  setSortBy,
  clearFilters,
  hasActiveFilters,
  totalProducts,
  filteredCount,
  searchPlaceholder
}) => {
  return (
    <div className="filter-controls">
      {/* Search Bar */}
      <div className="search-section">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={searchPlaceholder}
        />
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        setFilters={setFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Sort and Results Info */}
      <div className="controls-footer">
        <SortDropdown
          value={sortBy}
          onChange={setSortBy}
        />
        
        <div className="results-info">
          {filteredCount === totalProducts ? (
            <span>
              Showing <strong>{totalProducts}</strong> {totalProducts === 1 ? 'product' : 'products'}
            </span>
          ) : (
            <span>
              Showing <strong>{filteredCount}</strong> of <strong>{totalProducts}</strong> products
              {hasActiveFilters && (
                <button 
                  className="clear-inline-btn"
                  onClick={clearFilters}
                  title="Clear all filters"
                >
                  (clear filters)
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
