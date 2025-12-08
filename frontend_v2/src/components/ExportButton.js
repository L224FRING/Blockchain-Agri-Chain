import React from 'react';
import './ExportButton.css';

const ExportButton = ({ products, filename = 'products', label = 'Export CSV' }) => {
  const exportToCSV = () => {
    if (!products || products.length === 0) {
      alert('No products to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Product ID',
      'Name',
      'Origin',
      'Quantity',
      'Price (₹)',
      'State',
      'Farmer',
      'Wholesaler',
      'Retailer',
      'Harvest Date',
      'Expiry Date',
      'Days Until Expiry'
    ];

    // Convert products to CSV rows
    const rows = products.map(product => {
      const harvestDate = product.harvestDate ? new Date(Number(product.harvestDate) * 1000).toLocaleDateString() : 'N/A';
      const expiryDate = product.expiryDate ? new Date(Number(product.expiryDate) * 1000).toLocaleDateString() : 'N/A';
      
      // Calculate days until expiry
      let daysUntilExpiry = 'N/A';
      if (product.expiryDate) {
        const now = Math.floor(Date.now() / 1000);
        const expiry = Number(product.expiryDate);
        const daysLeft = Math.floor((expiry - now) / (24 * 60 * 60));
        daysUntilExpiry = daysLeft > 0 ? daysLeft : 'Expired';
      }

      return [
        product.id || 'N/A',
        `"${product.name || 'N/A'}"`, // Quotes for names with commas
        `"${product.origin || 'N/A'}"`,
        product.quantity || 0,
        product.price || 0,
        getStateName(product.state),
        product.farmer ? `"${product.farmer}"` : 'N/A',
        product.wholesaler ? `"${product.wholesaler}"` : 'N/A',
        product.retailer ? `"${product.retailer}"` : 'N/A',
        harvestDate,
        expiryDate,
        daysUntilExpiry
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStateName = (state) => {
    const states = [
      'Harvested',
      'ProposedToWholesaler',
      'ReceivedByWholesaler',
      'ProposedToRetailer',
      'ReceivedByRetailer',
      'ForSale',
      'SoldToConsumer',
      'Rated'
    ];
    return states[state] || 'Unknown';
  };

  return (
    <button className="export-btn" onClick={exportToCSV} title="Export to CSV">
      📊 {label}
    </button>
  );
};

export default ExportButton;
