import React from 'react';
import './App.css'; // Reuse App.css for styling

// The 'onLogin' prop is a function passed down from App.js
// It will be called when a user clicks a login button, passing the role ('Farmer', etc.)
// This function will handle connecting the wallet.
function Home({ onLogin }) {
  return (
    <div className="home-container animate-fade-in">
      {/* Hero Section with Project Title and Description */}
      <div className="hero-section card">
        <h1>Welcome to 🌱 AgriChain</h1>
        <p className="subtitle">
          Bringing transparency and trust to the agricultural supply chain using blockchain technology.
          Track produce from farm to table with verifiable, immutable records.
        </p>
      </div>

      {/* Section for Role Selection/Login */}
      <div className="role-login-section">
        <h2>Select Your Role to Begin</h2>
        <p>Choose your role below to connect your wallet and access your dashboard.</p>

        {/* Grid Layout for Role Login Cards */}
        <div className="role-login-grid">

          {/* Farmer Login Card */}
          <div className="card role-card">
            <h3>🧑‍🌾 Farmer</h3>
            <p>Add your harvested products to the blockchain and manage your inventory.</p>
            {/* When clicked, call the onLogin function passed from App.js with 'Farmer' */}
            <button className="button-primary" onClick={() => onLogin('Farmer')}>
              Connect as Farmer
            </button>
          </div>

          {/* Wholesaler Login Card */}
          <div className="card role-card">
            <h3>🏭 Wholesaler</h3>
            <p>Receive shipments, manage processing, and distribute products to retailers.</p>
            <button className="button-primary" onClick={() => onLogin('Wholesaler')}>
              Connect as Wholesaler
            </button>
          </div>

          {/* Retailer Login Card */}
          <div className="card role-card">
            <h3>🛒 Retailer</h3>
            <p>Manage store inventory received from wholesalers and track sales.</p>
            <button className="button-primary" onClick={() => onLogin('Retailer')}>
              Connect as Retailer
            </button>
          </div>

          {/* Consumer Login Card */}
          <div className="card role-card">
            <h3>🧍 Consumer</h3>
            <p>Verify the origin and journey of your food by exploring the blockchain records.</p>
            <button className="button-primary" onClick={() => onLogin('Consumer')}>
              Connect as Consumer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Home;

