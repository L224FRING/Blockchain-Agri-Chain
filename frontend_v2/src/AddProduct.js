import { useState } from 'react';
import { ethers } from 'ethers';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS } from './config';

const PRICE_DECIMALS = 0; 

// Based on the provided food_shelf_life.pdf document.
// Using the lower-bound refrigerator storage time for safety.
const SHELF_LIFE_DATA = {
    // Produce
    'Apples': 30, // 1-2 months
    'Citrus Fruits': 21, // 3 weeks
    'Berries': 2, // 2-3 days
    'Lettuce, bagged': 3, // 3-5 days
    'Root Vegetables': 14, // 2-3 weeks
    
    // Dairy & Eggs
    'Eggs, in shell': 21, // 3 to 5 weeks
    'Milk': 7, // 1 week
    'Yogurt': 7, // 7 to 14 days
    'Hard Cheese': 21, // 3 to 4 weeks (opened)
    'Soft Cheese': 7, // 1 to 2 weeks
    
    // Raw Meat
    'Ground Meat': 1, // 1 to 2 days
    'Steaks, Roasts, Chops': 3, // 3 to 5 days
    
    // Raw Poultry
    'Chicken or Turkey, Whole': 1, // 1 to 2 days
    'Chicken or Turkey, parts': 1, // 1 to 2 days
    
    // Raw Seafood
    'Fish': 1, // 1 to 2 days
    'Shellfish': 1, // 1 to 2 days
    
    // Pantry / Other (as a fallback)
    'Canned Goods (Low-Acid)': 730, // 2 to 5 years
    'Dried Goods (Pasta/Rice)': 730, // 2 years
};


function AddProduct({ onProductAdded }) {
    const [name, setName] = useState('');
    const [origin, setOrigin] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('kg');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [harvestDate, setHarvestDate] = useState(''); // <-- NEW STATE
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Utility to parse logs and find the emitted ID
    const getProductIdFromReceipt = (receipt) => {
        try {
            const contractInterface = new ethers.Interface(SUPPLY_CHAIN_ABI);
            
            if (!receipt || !receipt.logs || !receipt.logs.length) {
                console.warn('No logs found in receipt');
                return null;
            }
            
            for (const log of receipt.logs) {
                try {
                    const parsedLog = contractInterface.parseLog(log);
                    
                    if (parsedLog && parsedLog.name === 'ProductAdded') {
                        const id = parsedLog.args[0] || parsedLog.args['id'];
                        console.log('ProductAdded event found, extracted ID:', id);
                        return Number(id);
                    }
                } catch (e) {
                    console.debug('Could not parse log:', e.message);
                }
            }
            console.warn('ProductAdded event not found in logs');
            return null;
        } catch (error) {
            console.error('Error parsing receipt:', error);
            return null;
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        // New validation logic
        if (!name || !origin || !quantity || !unit || !price || !category || !harvestDate) { // <-- ADDED harvestDate validation
             setMessage("Error: Please fill all product details (Name, Origin, Quantity, Unit, Price, Category, and Harvest Date).");
             return;
        }
        if (Number(quantity) <= 0 || Number(price) <= 0) {
             setMessage("Error: Quantity and Price must be greater than zero.");
             return;
        }
        
        const daysToExpiry = SHELF_LIFE_DATA[category];
        if (!daysToExpiry) {
            setMessage("Error: Invalid product category selected.");
            return;
        }

        if (!window.ethereum) {
             setMessage('Error: Please install MetaMask to use this feature.');
             return;
        }

        setLoading(true);
        setMessage('Connecting to MetaMask...');

        try {
            // 1. Get provider and signer
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, signer);

            // 2. Prepare transaction data
            setMessage('Preparing transaction for blockchain...');
            
            const priceInUnits = ethers.parseUnits(price, PRICE_DECIMALS); 
            const quantityInUnits = ethers.parseUnits(quantity, PRICE_DECIMALS); 

            // --- UPDATED EXPIRY DATE LOGIC ---
            // Calculate expiry based on HARVEST date, not today's date
            const harvest = new Date(harvestDate);
            const expiry = new Date(harvest);
            expiry.setDate(harvest.getDate() + daysToExpiry); // Add the days from our shelf life map
            
            // Convert expiry date to Unix timestamp
            const expiryTimestamp = Math.floor(expiry.getTime() / 1000);
            // --- END UPDATED LOGIC ---
            
            // 3. Transaction 1: Add the product
            setMessage('Waiting for addProduct transaction signature...');
            const tx = await contract.addProduct(name, origin, quantityInUnits, unit, priceInUnits, expiryTimestamp);
            
            setMessage(`Transaction submitted. Waiting for confirmation... TxHash: ${tx.hash.substring(0, 10)}...`);
            const receipt = await tx.wait();
            
            const realTxHash = receipt.hash;
            
            let newProductId = getProductIdFromReceipt(receipt);
            
            if (!newProductId) {
                console.warn('Could not extract product ID from logs, using fallback method...');
                try {
                    const productCount = await contract.productCount();
                    newProductId = Number(productCount);
                    console.log('Using fallback product ID:', newProductId);
                } catch (fallbackError) {
                    console.error('Fallback method also failed:', fallbackError);
                    throw new Error("Failed to retrieve new Product ID from transaction receipt or via fallback method.");
                }
            }

            // 4. Final step: Refresh the dashboard data
            if (onProductAdded) {
                await onProductAdded(realTxHash, newProductId);
            }

            setMessage(`✅ Success! Product ID ${newProductId} added. TxHash: ${realTxHash.substring(0, 10)}... Dashboard refreshed.`);
            
            // Clear form
            setName('');
            setOrigin('');
            setQuantity('');
            setPrice('');
            setCategory('');
            setHarvestDate(''); // <-- ADDED to clear harvest date
            
        } catch (error)
        {
            console.error("Transaction Error:", error);
            if (error.code === 4001) {
                setMessage('Error: Transaction rejected by user.');
            } else {
                if (error.message.includes('insufficient funds')) {
                    setMessage('Error: Insufficient funds for gas. Please check your Sepolia ETH balance.');
                } else {
                    setMessage(`Error: Failed to process transaction. Check console for details.`);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-product-form">
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Product Name:</label>
                    <input 
                        type="text" 
                        placeholder="e.g., Organic Apples" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                    />
                </div>
                <div className="form-group">
                    <label>Product Origin (Farm Name):</label>
                    <input 
                        type="text" 
                        placeholder="e.g., Nashik Farm" 
                        value={origin} 
                        onChange={(e) => setOrigin(e.target.value)} 
                    />
                </div>
                
                <div className="form-group-row">
                    <div className="form-group">
                        <label>Quantity:</label>
                        <input 
                            type="number" 
                            placeholder="e.g., 500" 
                            value={quantity} 
                            onChange={(e) => setQuantity(e.target.value)} 
                            min="1"
                        />
                    </div>
                    <div className="form-group">
                        <label>Unit:</label>
                        <select 
                            value={unit} 
                            onChange={(e) => setUnit(e.target.value)} 
                        >
                            <option value="kg">kg</option>
                            <option value="crates">Crates</option>
                            <option value="liters">Liters</option>
                            <option value_eth="tonnes">Tonnes</option>
                        </select>
                    </div>
                </div>
                
                <div className="form-group">
                    <label>Price Per Unit (in INR/USD):</label>
                    <input 
                        type="number" 
                        placeholder="e.g., 10" 
                        value={price} 
                        onChange={(e) => setPrice(e.target.value)} 
                        min="1"
                    />
                </div>

                {/* --- NEW HARVEST DATE FIELD --- */}
                <div className="form-group">
                    <label>Harvest Date:</label>
                    <input 
                        type="date" 
                        value={harvestDate} 
                        onChange={(e) => setHarvestDate(e.target.value)}
                        // Prevent selecting a future date for harvest
                        max={new Date().toISOString().split('T')[0]} 
                    />
                </div>
                {/* --- END NEW FIELD --- */}

                <div className="form-group">
                    <label>Product Category:</label>
                    <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="">-- Select Category --</option>
                        {/* Use Object.keys to dynamically create options */}
                        {Object.keys(SHELF_LIFE_DATA).map((catName) => (
                            <option key={catName} value={catName}>
                                {catName} ({SHELF_LIFE_DATA[catName]} days)
                            </option>
                        ))}
                    </select>
                </div>

                <button type="submit" className="button-primary" disabled={loading}>
                    {loading ? (
                        <>
                            <span className="spinner"></span> 
                            Processing...
                        </>
                    ) : (
                        <>
                            <span role="img" aria-label="chain">⛓️</span>
                            Add Product to Blockchain
                        </>
                    )}
                </button>
            </form>
            {message && <p className={`message ${message.startsWith('✅') ? 'message-success' : 'message-error'}`}>{message}</p>}
        </div>
    );
}

export default AddProduct;
