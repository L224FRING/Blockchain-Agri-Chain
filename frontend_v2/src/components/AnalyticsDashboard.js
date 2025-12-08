import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = ({ products, role, useDemoData = false }) => {
  const analytics = useMemo(() => {
    // Use demo data if requested or if no products
    if (useDemoData || !products || products.length === 0) {
      return {
        stateData: [
          { name: 'Harvested', value: 15 },
          { name: 'ReceivedByWholesaler', value: 8 },
          { name: 'ForSale', value: 5 },
          { name: 'SoldToConsumer', value: 3 }
        ],
        priceRanges: [
          { name: '₹0-1000', count: 5 },
          { name: '₹1000-5000', count: 12 },
          { name: '₹5000-10000', count: 8 },
          { name: '₹10000+', count: 6 }
        ],
        expiryData: [
          { name: 'Fresh', value: 20, color: '#10b981' },
          { name: 'Expiring Soon', value: 8, color: '#f59e0b' },
          { name: 'Expired', value: 3, color: '#ef4444' }
        ],
        totalValue: 185000,
        avgPrice: 5967,
        totalQuantity: 3250,
        avgQuantity: 105,
        totalProducts: 31
      };
    }

    // State distribution
    const stateNames = ['Harvested', 'ProposedToWholesaler', 'ReceivedByWholesaler', 'ProposedToRetailer', 'ReceivedByRetailer', 'ForSale', 'SoldToConsumer', 'Rated'];
    const stateCounts = {};
    stateNames.forEach((_, i) => stateCounts[i] = 0);
    products.forEach(p => stateCounts[p.state] = (stateCounts[p.state] || 0) + 1);
    
    const stateData = Object.entries(stateCounts)
      .filter(([_, count]) => count > 0)
      .map(([state, count]) => ({
        name: stateNames[state] || 'Unknown',
        value: count
      }));

    // Price distribution
    const priceRanges = [
      { name: '₹0-1000', min: 0, max: 1000, count: 0 },
      { name: '₹1000-5000', min: 1000, max: 5000, count: 0 },
      { name: '₹5000-10000', min: 5000, max: 10000, count: 0 },
      { name: '₹10000+', min: 10000, max: Infinity, count: 0 }
    ];
    
    products.forEach(p => {
      const price = Number(p.price || 0);
      const range = priceRanges.find(r => price >= r.min && price < r.max);
      if (range) range.count++;
    });

    // Expiry status
    const now = Math.floor(Date.now() / 1000);
    const threeDays = 3 * 24 * 60 * 60;
    let fresh = 0, expiring = 0, expired = 0;
    
    products.forEach(p => {
      if (p.expiryDate) {
        const expiry = Number(p.expiryDate);
        const timeLeft = expiry - now;
        if (timeLeft < 0) expired++;
        else if (timeLeft < threeDays) expiring++;
        else fresh++;
      }
    });

    const expiryData = [
      { name: 'Fresh', value: fresh, color: '#10b981' },
      { name: 'Expiring Soon', value: expiring, color: '#f59e0b' },
      { name: 'Expired', value: expired, color: '#ef4444' }
    ].filter(d => d.value > 0);

    // Total value
    const totalValue = products.reduce((sum, p) => sum + Number(p.price || 0), 0);
    const avgPrice = products.length > 0 ? totalValue / products.length : 0;

    // Quantity stats
    const totalQuantity = products.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
    const avgQuantity = products.length > 0 ? totalQuantity / products.length : 0;

    return {
      stateData,
      priceRanges: priceRanges.filter(r => r.count > 0),
      expiryData,
      totalValue,
      avgPrice,
      totalQuantity,
      avgQuantity,
      totalProducts: products.length
    };
  }, [products]);

  if (!analytics) {
    return (
      <div className="analytics-empty">
        <p>📊 No data available for analytics</p>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className="analytics-dashboard">
      <h2>📊 Analytics Dashboard</h2>
      
      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card">
          <div className="summary-icon">📦</div>
          <div className="summary-content">
            <div className="summary-value">{analytics.totalProducts}</div>
            <div className="summary-label">Total Products</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-value">₹{analytics.totalValue.toLocaleString()}</div>
            <div className="summary-label">Total Value</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <div className="summary-value">₹{Math.round(analytics.avgPrice).toLocaleString()}</div>
            <div className="summary-label">Avg Price</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">⚖️</div>
          <div className="summary-content">
            <div className="summary-value">{Math.round(analytics.totalQuantity)} kg</div>
            <div className="summary-label">Total Quantity</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="analytics-charts">
        {/* Product State Distribution */}
        {analytics.stateData.length > 0 && (
          <div className="chart-card">
            <h3>Product State Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.stateData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.stateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Price Distribution */}
        {analytics.priceRanges.length > 0 && (
          <div className="chart-card">
            <h3>Price Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.priceRanges}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Products" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expiry Status */}
        {analytics.expiryData.length > 0 && (
          <div className="chart-card">
            <h3>Expiry Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.expiryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.expiryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
