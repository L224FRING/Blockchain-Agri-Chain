# 🛠️ Implementation Guide: Top 3 Upgrades

Detailed step-by-step guide for implementing the highest-impact upgrades to AgriChain.

---

## 🎯 Overview

We'll implement these 3 features in order:
1. **Search & Filtering System** (3-5 days) - No blockchain changes
2. **Notifications System** (1 week) - Minor blockchain changes
3. **IPFS Image Storage** (1-2 weeks) - Moderate blockchain changes

**Total Timeline:** 2-3 weeks  
**Total Cost:** Minimal (mostly development time)

---

## 1️⃣ SEARCH & FILTERING SYSTEM

### 📋 Requirements
- Search products by name, origin, ID
- Filter by state, price range, expiry status
- Sort by price, date, rating
- Persist filters in localStorage
- Export filtered results

### 🏗️ Architecture

```
Frontend Components:
├── SearchBar.js          (Search input with debounce)
├── FilterPanel.js        (All filter controls)
├── SortDropdown.js       (Sort options)
└── useProductFilter.js   (Custom hook for filter logic)
```

### 📝 Step-by-Step Implementation

#### Step 1: Create the Filter Hook (Day 1)

**File:** `frontend_v2/src/hooks/useProductFilter.js`

```javascript
import { useState, useMemo, useEffect } from 'react';

export const useProductFilter = (products) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    states: [],
    priceRange: { min: 0, max: Infinity },
    expiryStatus: 'all', // 'all', 'fresh', 'expiring', 'expired'
    dateRange: { start: null, end: null }
  });
  const [sortBy, setSortBy] = useState('date-desc');

  // Load filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('agrichain-filters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFilters(parsed.filters || filters);
        setSortBy(parsed.sortBy || 'date-desc');
      } catch (e) {
        console.error('Error loading filters:', e);
      }
    }
  }, []);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem('agrichain-filters', JSON.stringify({
      filters,
      sortBy
    }));
  }, [filters, sortBy]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.origin.toLowerCase().includes(term) ||
        p.id.toString().includes(term)
      );
    }

    // State filter
    if (filters.states.length > 0) {
      result = result.filter(p => filters.states.includes(p.currentState));
    }

    // Price range filter
    result = result.filter(p => {
      const price = Number(p.pricePerUnit);
      return price >= filters.priceRange.min && price <= filters.priceRange.max;
    });

    // Expiry status filter
    if (filters.expiryStatus !== 'all') {
      const now = Date.now() / 1000;
      const threeDays = 3 * 24 * 60 * 60;
      
      result = result.filter(p => {
        const expiry = Number(p.expiryDate);
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

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      result = result.filter(p => {
        const created = Number(p.creationTimestamp || 0);
        if (filters.dateRange.start && created < filters.dateRange.start) return false;
        if (filters.dateRange.end && created > filters.dateRange.end) return false;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return Number(a.pricePerUnit) - Number(b.pricePerUnit);
        case 'price-desc':
          return Number(b.pricePerUnit) - Number(a.pricePerUnit);
        case 'date-asc':
          return Number(a.creationTimestamp || 0) - Number(b.creationTimestamp || 0);
        case 'date-desc':
          return Number(b.creationTimestamp || 0) - Number(a.creationTimestamp || 0);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'expiry-asc':
          return Number(a.expiryDate) - Number(b.expiryDate);
        case 'expiry-desc':
          return Number(b.expiryDate) - Number(a.expiryDate);
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchTerm, filters, sortBy]);

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

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    filteredProducts,
    clearFilters,
    totalProducts: products.length,
    filteredCount: filteredProducts.length
  };
};
```

#### Step 2: Create Filter Components (Day 2)

**File:** `frontend_v2/src/components/SearchBar.js`

```javascript
import React, { useState, useEffect } from 'react';
import './SearchBar.css';

const SearchBar = ({ value, onChange, placeholder = "Search products..." }) => {
  const [localValue, setLocalValue] = useState(value);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="search-input"
      />
      {localValue && (
        <button 
          className="clear-search"
          onClick={() => setLocalValue('')}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchBar;
```

**File:** `frontend_v2/src/components/FilterPanel.js`

```javascript
import React from 'react';
import { STATE_MAPPING } from '../config';
import './FilterPanel.css';

const FilterPanel = ({ filters, setFilters, onClear }) => {
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

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>Filters</h3>
        <button onClick={onClear} className="clear-filters-btn">
          Clear All
        </button>
      </div>

      {/* State Filter */}
      <div className="filter-section">
        <h4>Product State</h4>
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
        <h4>Price Range (₹)</h4>
        <div className="price-inputs">
          <input
            type="number"
            placeholder="Min"
            value={filters.priceRange.min || ''}
            onChange={(e) => updateFilter('priceRange', {
              ...filters.priceRange,
              min: Number(e.target.value) || 0
            })}
            className="price-input"
          />
          <span>to</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.priceRange.max === Infinity ? '' : filters.priceRange.max}
            onChange={(e) => updateFilter('priceRange', {
              ...filters.priceRange,
              max: Number(e.target.value) || Infinity
            })}
            className="price-input"
          />
        </div>
      </div>

      {/* Expiry Status Filter */}
      <div className="filter-section">
        <h4>Expiry Status</h4>
        <select
          value={filters.expiryStatus}
          onChange={(e) => updateFilter('expiryStatus', e.target.value)}
          className="filter-select"
        >
          <option value="all">All Products</option>
          <option value="fresh">Fresh (3+ days)</option>
          <option value="expiring">Expiring Soon (≤3 days)</option>
          <option value="expired">Expired</option>
        </select>
      </div>
    </div>
  );
};

export default FilterPanel;
```

#### Step 3: Add Styling (Day 2)

**File:** `frontend_v2/src/components/SearchBar.css`

```css
.search-bar {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin-bottom: 1rem;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 45px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.clear-search {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
  transition: color 0.2s;
}

.clear-search:hover {
  color: #333;
}
```

**File:** `frontend_v2/src/components/FilterPanel.css`

```css
.filter-panel {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

.filter-header h3 {
  margin: 0;
  color: #333;
}

.clear-filters-btn {
  background: none;
  border: 1px solid #e0e0e0;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #666;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.filter-section {
  margin-bottom: 1.5rem;
}

.filter-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  color: #555;
  font-weight: 600;
}

.filter-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: #666;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.price-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.price-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.9rem;
}

.filter-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
}
```

#### Step 4: Integrate into Views (Day 3)

Update each view (FarmerView, WholesalerView, etc.) to use the filter system:

```javascript
import { useProductFilter } from '../hooks/useProductFilter';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';

function FarmerView({ products, loading, connectedWallet, fetchProducts, onLogout }) {
  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    filteredProducts,
    clearFilters,
    totalProducts,
    filteredCount
  } = useProductFilter(products);

  // Use filteredProducts instead of products in your Dashboard components
  
  return (
    <>
      <div className="filter-controls">
        <SearchBar 
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search your products..."
        />
        
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          onClear={clearFilters}
        />
        
        <div className="results-info">
          Showing {filteredCount} of {totalProducts} products
        </div>
      </div>

      <Dashboard
        products={filteredProducts} // Use filtered products
        loading={loading}
        // ... rest of props
      />
    </>
  );
}
```

---

## 2️⃣ NOTIFICATIONS SYSTEM

### 📋 Requirements
- Toast notifications for real-time events
- Notification center with history
- Unread badge counter
- Mark as read functionality
- Sound/visual alerts (optional)

### 🏗️ Architecture

```
Components:
├── NotificationBell.js      (Bell icon with badge)
├── NotificationCenter.js    (Dropdown panel)
├── NotificationItem.js      (Individual notification)
└── useNotifications.js      (Custom hook)

Context:
└── NotificationContext.js   (Global state)
```

### 📝 Step-by-Step Implementation

#### Step 1: Create Notification Context (Day 1)

**File:** `frontend_v2/src/context/NotificationContext.js`

```javascript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS } from '../config';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children, connectedWallet }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage
  useEffect(() => {
    if (connectedWallet) {
      const saved = localStorage.getItem(`notifications_${connectedWallet}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNotifications(parsed);
          setUnreadCount(parsed.filter(n => !n.read).length);
        } catch (e) {
          console.error('Error loading notifications:', e);
        }
      }
    }
  }, [connectedWallet]);

  // Save notifications to localStorage
  useEffect(() => {
    if (connectedWallet && notifications.length > 0) {
      localStorage.setItem(
        `notifications_${connectedWallet}`,
        JSON.stringify(notifications)
      );
    }
  }, [notifications, connectedWallet]);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: Date.now(),
      read: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);

    // Show toast (you can use react-toastify here)
    console.log('New notification:', newNotification);
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    if (connectedWallet) {
      localStorage.removeItem(`notifications_${connectedWallet}`);
    }
  }, [connectedWallet]);

  // Listen to blockchain events
  useEffect(() => {
    if (!connectedWallet || !window.ethereum) return;

    const setupListeners = async () => {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, provider);

      // Listen for TransferProposed events
      contract.on('TransferProposed', (productId, from, toUsername, toAddress) => {
        if (toAddress.toLowerCase() === connectedWallet.toLowerCase()) {
          addNotification({
            type: 'transfer_proposed',
            title: 'New Transfer Proposal',
            message: `You have a new transfer proposal for Product #${productId}`,
            productId: Number(productId),
            from: from
          });
        }
      });

      // Listen for TransferConfirmed events
      contract.on('TransferConfirmed', (productId, by, role) => {
        // Add logic based on your needs
      });

      // Add more event listeners as needed
    };

    setupListeners();

    return () => {
      // Cleanup listeners
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, provider);
        contract.removeAllListeners();
      }
    };
  }, [connectedWallet, addNotification]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
```

#### Step 2: Create Notification Components (Day 2-3)

**File:** `frontend_v2/src/components/NotificationBell.js`

```javascript
import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import NotificationCenter from './NotificationCenter';
import './NotificationBell.css';

const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="notification-overlay"
            onClick={() => setIsOpen(false)}
          />
          <NotificationCenter onClose={() => setIsOpen(false)} />
        </>
      )}
    </div>
  );
};

export default NotificationBell;
```

Continue with NotificationCenter.js and styling...

---

## 3️⃣ IPFS IMAGE STORAGE

### 📋 Requirements
- Upload product images
- Store IPFS hash on blockchain
- Display images in product cards
- Image gallery in history modal

### 🏗️ Architecture

```
Smart Contract Changes:
└── Add imageHashes array to Product struct

Frontend Components:
├── ImageUpload.js        (Upload component)
├── ImageGallery.js       (Display component)
└── useIPFS.js            (IPFS integration hook)

Services:
└── ipfsService.js        (Pinata/NFT.Storage integration)
```

### 📝 Implementation Steps

[Detailed implementation steps for IPFS integration...]

---

## 📊 Testing Checklist

### Search & Filtering
- [ ] Search works with debounce
- [ ] All filters work correctly
- [ ] Filters persist in localStorage
- [ ] Clear filters works
- [ ] Sorting works for all options
- [ ] Mobile responsive

### Notifications
- [ ] Events trigger notifications
- [ ] Badge count updates correctly
- [ ] Mark as read works
- [ ] Notifications persist
- [ ] No duplicate notifications

### IPFS Images
- [ ] Images upload successfully
- [ ] IPFS hash stored on blockchain
- [ ] Images display correctly
- [ ] Fallback for missing images
- [ ] Image compression works

---

## 🚀 Deployment

After implementing each feature:

1. Test locally
2. Deploy updated contracts (if needed)
3. Update frontend
4. Test on Sepolia
5. Gather user feedback
6. Iterate

---

## 📚 Resources

- React Hooks: https://react.dev/reference/react
- IPFS Pinata: https://docs.pinata.cloud/
- ethers.js Events: https://docs.ethers.org/v6/api/contract/#ContractEvent
- React Context: https://react.dev/reference/react/useContext

---

Ready to start implementing? Begin with Search & Filtering - it's the quickest win! 🎯
