import { useState, useMemo, useEffect } from 'react';

/**
 * Custom hook for filtering and sorting products
 * Includes search, filters, sorting, and localStorage persistence
 * @param {Array} products - Array of products to filter
 * @param {string} storageKey - Unique key for localStorage (e.g., 'farmer-inventory', 'wholesaler-marketplace')
 */
export const useProductFilter = (products, storageKey = 'default') => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    states: [],
    priceRange: { min: 0, max: Infinity },
    expiryStatus: 'all', // 'all', 'fresh', 'expiring', 'expired'
    dateRange: { start: null, end: null }
  });
  const [sortBy, setSortBy] = useState('date-desc');

  // Clear filters on mount - fresh start every time
  // This prevents old filters from hiding products when you login
  useEffect(() => {
    // Clean up any old filter keys from localStorage
    if (localStorage.getItem('agrichain-filters')) {
      localStorage.removeItem('agrichain-filters');
    }
    // Also clean up view-specific keys
    localStorage.removeItem(`agrichain-filters-${storageKey}`);
  }, [storageKey]);

  // Note: We don't save filters to localStorage anymore
  // Filters reset on every page load for a clean experience

  // Main filtering and sorting logic
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    let result = [...products];

    // 1. Search filter (name, origin, or ID)
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(term) ||
        p.origin?.toLowerCase().includes(term) ||
        p.id?.toString().includes(term)
      );
    }

    // 2. State filter
    if (filters.states.length > 0) {
      result = result.filter(p => filters.states.includes(p.currentState));
    }

    // 3. Price range filter
    if (filters.priceRange.min > 0 || filters.priceRange.max < Infinity) {
      result = result.filter(p => {
        const price = Number(p.pricePerUnit || 0);
        return price >= filters.priceRange.min && price <= filters.priceRange.max;
      });
    }

    // 4. Expiry status filter
    if (filters.expiryStatus !== 'all') {
      const now = Date.now() / 1000;
      const threeDays = 3 * 24 * 60 * 60;
      
      result = result.filter(p => {
        const expiry = Number(p.expiryDate || 0);
        const timeUntilExpiry = expiry - now;
        
        if (filters.expiryStatus === 'fresh') {
          return timeUntilExpiry > threeDays;
        } else if (filters.expiryStatus === 'expiring') {
          return timeUntilExpiry > 0 && timeUntilExpiry <= threeDays;
        } else if (filters.expiryStatus === 'expired') {
          return timeUntilExpiry <= 0;
        }
        return true;
      });
    }

    // 5. Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      result = result.filter(p => {
        const created = Number(p.creationTimestamp || 0);
        if (filters.dateRange.start && created < filters.dateRange.start) return false;
        if (filters.dateRange.end && created > filters.dateRange.end) return false;
        return true;
      });
    }

    // 6. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return Number(a.pricePerUnit || 0) - Number(b.pricePerUnit || 0);
        case 'price-desc':
          return Number(b.pricePerUnit || 0) - Number(a.pricePerUnit || 0);
        case 'date-asc':
          return Number(a.creationTimestamp || 0) - Number(b.creationTimestamp || 0);
        case 'date-desc':
          return Number(b.creationTimestamp || 0) - Number(a.creationTimestamp || 0);
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'expiry-asc':
          return Number(a.expiryDate || 0) - Number(b.expiryDate || 0);
        case 'expiry-desc':
          return Number(b.expiryDate || 0) - Number(a.expiryDate || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchTerm, filters, sortBy]);

  // Clear all filters and search
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      states: [],
      priceRange: { min: 0, max: Infinity },
      expiryStatus: 'all',
      dateRange: { start: null, end: null }
    });
    setSortBy('date-desc');
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm.trim() !== '' ||
           filters.states.length > 0 ||
           filters.priceRange.min > 0 ||
           filters.priceRange.max < Infinity ||
           filters.expiryStatus !== 'all' ||
           filters.dateRange.start !== null ||
           filters.dateRange.end !== null;
  };

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    filteredProducts,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
    totalProducts: products?.length || 0,
    filteredCount: filteredProducts.length
  };
};
