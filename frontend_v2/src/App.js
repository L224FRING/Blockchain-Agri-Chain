import './App.css';
import { useState, useEffect, useCallback } from 'react'; // CORRECTED SYNTAX
import { ethers } from 'ethers';
// Make sure you have your contract address and ABI correctly defined in config.js
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS } from './config';

// Import Views
// Import views
import Auth from './components/Auth';
import FarmerView from './FarmerView';
import WholesalerView from './WholesalerView';
import RetailerView from './RetailerView';
import ConsumerView from './ConsumerView';


function App() {
  // State Hooks - These define the setters that ESLint reported as undefined
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedInRole, setLoggedInRole] = useState(null); // Tracks the logged-in role, null = logged out (show Home)
  const [connectedWallet, setConnectedWallet] = useState(null); // Tracks the connected wallet address

  // --- Wallet Connection Logic ---
  // Connects wallet and returns address on success, null on failure
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return null; // Indicate failure
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      // Request account access
      await provider.send("eth_requestAccounts", []);
      // Get the signer object
      const signer = await provider.getSigner();
      // Get the address
      const address = await signer.getAddress();
      setConnectedWallet(address); // Update state
      console.log("Wallet Connected:", address);
      return address; // Return address on success
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      // Handle user rejection specifically
      if (error.code === 4001) {
          // Changed from alert to console log for less intrusion
          console.warn("Wallet connection rejected by user.");
      } else {
          alert("Failed to connect wallet. See console for details.");
      }
      return null; // Indicate failure
    }
  };

  // --- Login Handler (Called from Auth component) ---
  // Sets both role and wallet address after authentication
  const handleLogin = async (role, walletAddress) => {
    console.log(`Authenticated as ${role} with wallet ${walletAddress}`);
    setLoggedInRole(role);
    setConnectedWallet(walletAddress);
  };

  // --- Logout Handler ---
  // Clears the role and wallet state to return to the Home page
  const handleLogout = () => {
    console.log("Logging out (clearing app state)...");
    // Note: Programmatic disconnection from MetaMask is not reliable/standard.
    // Clearing the app's state is the effective way to log out.
    setLoggedInRole(null); // USING THE DEFINED SETTER
    setConnectedWallet(null); // USING THE DEFINED SETTER
    setProducts([]); // USING THE DEFINED SETTER
    console.log("Logged out - state cleared.");
  };


  // --- Auto-Connect and Account Change Listener ---
  useEffect(() => {
    const tryAutoConnect = async () => {
      if (window.ethereum?.isMetaMask) { // Check if MetaMask is installed
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts(); // Use listAccounts which returns Signer[] or empty array
          if (accounts.length > 0) {
            // If already connected/permitted, set the wallet address but DON'T log in yet
            setConnectedWallet(accounts[0].address);
            console.log("Wallet previously connected:", accounts[0].address);
          } else {
             console.log("MetaMask found, but no accounts connected/permitted yet.");
          }
        } catch (error) {
          console.error("Auto-connect check failed:", error);
        }
      } else {
         console.log("MetaMask extension not detected.");
      }
    };
    tryAutoConnect();

    // Listener for account changes
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        const newAddress = accounts[0];
        console.log("Wallet Account Changed:", newAddress);
        setConnectedWallet(newAddress);
        // Force logout if account changes while logged in, requires re-login
        if (loggedInRole) {
          console.log("Account changed, logging out.");
          setLoggedInRole(null); // Use setter here
          setProducts([]); // Use setter here
        }
      } else {
        // Handle disconnection
        console.log("Wallet Disconnected");
        setConnectedWallet(null); // Use setter here
        setLoggedInRole(null); // Use setter here
        setProducts([]); // Use setter here
      }
    };

    if (window.ethereum?.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      console.log("Account change listener attached.");
    }

    // Cleanup listener on component unmount
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        console.log("Account change listener removed.");
      }
    };
  }, [loggedInRole]); // Re-run if loggedInRole changes (to handle logout on account change)


  // --- Product Fetching Logic ---
  // Fetches all products from the smart contract
  // Includes localStorage logic for hash persistence
  const fetchProducts = useCallback(async (newProductHash = null, newProductId = null) => {
    if (!connectedWallet || !window.ethereum) {
      console.log("Fetch skipped: Wallet not connected or MetaMask not installed.");
      setLoading(false); return;
    }

    console.log("Fetching products...");
    setLoading(true);

    const maxRetries = newProductHash ? 5 : 1;
    let items = [];
    let hashInjectedThisFetch = false;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();

            if (network.chainId !== 11155111n) {
                console.warn(`Connected to wrong network (Chain ID: ${network.chainId}). Switch to Sepolia.`);
                setProducts([]); setLoading(false); return; // Use setter here
            }

            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, provider);
            const data = await contract.getAllProducts();

            items = data.map(item => {
                const itemId = Number(item.id);
                // --- Read Hash from localStorage if missing ---
                let storedHash = localStorage.getItem(`product_HASH_${itemId}`);
                let finalHash = item.transactionHash || storedHash || ""; // Use contract hash, fallback to localStorage, then empty

                return {
                    id: itemId,
                    name: item.name,
                    origin: item.origin,
                    owner: item.owner,
                    farmer: item.farmer,           
                    wholesaler: item.wholesaler,
                    retailer: item.retailer,
                    txHash: finalHash,
                    quantity: item.quantity,
                    unit: item.unit,
                    pricePerUnit: item.pricePerUnit,
                    currentState: Number(item.currentState),
                    expiryDate: item.expiryDate,
                    farmerRated: item.farmerRated,    
                    wholesalerRated: item.wholesalerRated,
                    retailerRated: item.retailerRated,
                };
            });

            // --- Inject and Save Hash if new one provided ---
            if (newProductHash && newProductId) {
                const targetProductIndex = items.findIndex(item => item.id === newProductId);

                if (targetProductIndex !== -1) {
                    // Check if the hash is already set (either from contract or localStorage)
                    if (items[targetProductIndex].txHash === "") {
                        console.log(`Injecting & Saving hash ${newProductHash.substring(0, 10)}... for ID ${newProductId}`);
                        items[targetProductIndex].txHash = newProductHash;
                        // --- Save to localStorage ---
                        try {
                             localStorage.setItem(`product_HASH_${newProductId}`, newProductHash);
                        } catch (storageError) {
                             console.error("Failed to save hash to localStorage:", storageError);
                        }
                        hashInjectedThisFetch = true;
                        break; // Exit loop after successful injection
                    } else if (items[targetProductIndex].txHash === newProductHash) {
                         console.log(`Hash for ID ${newProductId} already matches. Injection complete.`);
                         hashInjectedThisFetch = true;
                         break; // Exit loop if hash already matches (prevents unnecessary retries)
                    } else {
                         // This case might happen if localStorage has an old/wrong hash
                         console.warn(`Hash for ID ${newProductId} already exists but differs. Overwriting localStorage.`);
                         items[targetProductIndex].txHash = newProductHash;
                          try {
                             localStorage.setItem(`product_HASH_${newProductId}`, newProductHash);
                        } catch (storageError) {
                             console.error("Failed to save hash to localStorage:", storageError);
                        }
                         hashInjectedThisFetch = true;
                         break; // Exit loop
                    }
                }
            } else {
                break; // No hash to inject, first attempt is enough
            }

            // Retry logic if hash injection failed
            if (newProductHash && attempt < maxRetries - 1 && !hashInjectedThisFetch) {
                console.log(`Hash injection target ID ${newProductId} not found on attempt ${attempt + 1}. Retrying in 1.5s...`);
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else if (newProductHash && !hashInjectedThisFetch) {
                console.warn(`Failed to inject hash for ID ${newProductId} after ${maxRetries} attempts.`);
            }

        } catch (error) {
            console.error(`Error fetching products on attempt ${attempt + 1}:`, error);
            if (attempt === maxRetries - 1) { // Only clear/stop loading on final error
                 setProducts([]); // Use setter here
                 setLoading(false); // Use setter here
                 return; // Exit fetch function on final error
            }
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    } // End Retry Loop

    setProducts(items); // Use setter here
    setLoading(false); // Use setter here
    console.log(`Finished fetching products. Hash injected this run: ${hashInjectedThisFetch}`);

  }, [connectedWallet, SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI]); // Dependencies remain the same


  // --- Effect to fetch products ---
  useEffect(() => {
    if (loggedInRole && connectedWallet) {
      console.log("User logged in / Wallet connected, triggering initial product fetch.");
      fetchProducts(null, null); // Initial fetch without hash/ID
    } else {
      console.log("User not logged in or wallet disconnected, clearing products.");
      setProducts([]); // Use setter here
      setLoading(false); // Use setter here
    }
  }, [loggedInRole, connectedWallet, fetchProducts]);


  // --- Renders the main content based on login state ---
  const renderContent = () => {
    // If no role is logged in (user is logged out), show the Auth page
    if (!loggedInRole) {
      return <Auth onLogin={handleLogin} />; // Pass handleLogin function as a prop
    }

    // If a role is logged in, show the corresponding view component
    switch (loggedInRole) {
      case 'Farmer':
        // Pass necessary data and functions down to the FarmerView
        return <FarmerView products={products} loading={loading} connectedWallet={connectedWallet} fetchProducts={fetchProducts} onLogout={handleLogout} />;
      case 'Wholesaler':
        // Pass necessary data and functions down to the WholesalerView (placeholder)
        return <WholesalerView products={products} loading={loading} connectedWallet={connectedWallet} fetchProducts={fetchProducts} onLogout={handleLogout} />;
      case 'Retailer':
        // Pass necessary data and functions down to the RetailerView (placeholder)
        return <RetailerView products={products} loading={loading} connectedWallet={connectedWallet} fetchProducts={fetchProducts} onLogout={handleLogout} />;
      case 'Consumer':
        // Pass necessary data and functions down to the ConsumerView
        return <ConsumerView products={products} loading={loading} connectedWallet={connectedWallet} fetchProducts={fetchProducts} onLogout={handleLogout} />;
      default:
        // Fallback to Auth if the role state is somehow invalid
        console.error("Invalid loggedInRole:", loggedInRole);
        return <Auth onLogin={handleLogin} />;
    }
  };

  // --- Main App JSX ---
  return (
    <div className="App">
      {/* Header Section */}
      <header className="app-header">
        <div className="logo">🌱 AgriChain</div> {/* Project Logo/Title */}
        {/* Right side of header: Wallet Info & Logout */}
        <div className="header-right">
          {connectedWallet ? (
            // Display wallet info and role badge if connected
            <div className="wallet-info">
              🔗 {`${connectedWallet.substring(0, 6)}...${connectedWallet.substring(connectedWallet.length - 4)}`}
              {loggedInRole && <span className="role-badge">{loggedInRole}</span>}
            </div>
          ) : (
            // Display placeholder if wallet is not connected
            <span className="wallet-info-placeholder">Wallet Not Connected</span>
          )}
          {/* Show Logout button only if a role is selected (i.e., user is logged in) */}
          {loggedInRole && (
               <button onClick={handleLogout} className="logout-button">Logout</button>
          )}
        </div>
      </header>

      {/* Main Content Area - Renders Home or Role View */}
      <main className="container">
        {renderContent()}
      </main>

      {/* Footer Section */}
      <footer className="app-footer">
        <p>&copy; 2025 AgriChain Project</p>
      </footer>
    </div>
  );
}

export default App;

// NOTE: Ensure there is no code outside the 'App' function or after 'export default App;'
// The ESLint errors suggest code might exist outside the valid component scope.

