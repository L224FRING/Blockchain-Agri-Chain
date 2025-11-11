import { useState } from 'react';
import { ethers } from 'ethers';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS } from './config';

const PRICE_DECIMALS = 0; 

function AddProduct({ onProductAdded }) {
    const [name, setName] = useState('');
    const [origin, setOrigin] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('kg');
    const [price, setPrice] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Utility to parse logs and find the emitted ID
    const getProductIdFromReceipt = (receipt) => {
        try {
            // Create an interface instance using the ABI
            const contractInterface = new ethers.Interface(SUPPLY_CHAIN_ABI);
            
            // The receipt.logs array contains all logs from the transaction
            if (!receipt || !receipt.logs || receipt.logs.length === 0) {
                console.warn('No logs found in receipt');
                return null;
            }
            
            // Loop through all logs in the receipt
            for (const log of receipt.logs) {
                try {
                    // Try to parse the log using the contract interface
                    const parsedLog = contractInterface.parseLog(log);
                    
                    // Check if the event name matches ProductAdded
                    if (parsedLog && parsedLog.name === 'ProductAdded') {
                        // Extract the product ID - it's the first indexed parameter
                        // In ethers v6, parsedLog.args is an array-like object
                        const id = parsedLog.args[0] || parsedLog.args['id'];
                        console.log('ProductAdded event found, extracted ID:', id);
                        return Number(id);
                    }
                } catch (e) {
                    // Ignore logs that don't match this contract interface
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
        if (!name || !origin || !quantity || !unit || !price) {
             setMessage("Error: Please fill all product details (Name, Origin, Quantity, Unit, Price).");
             return;
        }
        if (Number(quantity) <= 0 || Number(price) <= 0) {
             setMessage("Error: Quantity and Price must be greater than zero.");
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

            // Convert expiry date to Unix timestamp
            const expiryTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000);
            
            // 3. Transaction 1: Add the product
            setMessage('Waiting for addProduct transaction signature...');
            const tx = await contract.addProduct(name, origin, quantityInUnits, unit, priceInUnits, expiryTimestamp);
            
            setMessage(`Transaction submitted. Waiting for confirmation... TxHash: ${tx.hash.substring(0, 10)}...`);
            const receipt = await tx.wait(); // Wait for mining confirmation
            
            const realTxHash = receipt.hash;
            
            // CRITICAL FIX: Get the exact product ID from the log
            let newProductId = getProductIdFromReceipt(receipt);
            
            // Fallback: if we couldn't extract product ID from logs, query the contract
            if (!newProductId) {
                console.warn('Could not extract product ID from logs, using fallback method...');
                try {
                    // Get the latest product count to determine the new product ID
                    const productCount = await contract.productCount();
                    newProductId = Number(productCount);
                    console.log('Using fallback product ID:', newProductId);
                } catch (fallbackError) {
                    console.error('Fallback method also failed:', fallbackError);
                    throw new Error("Failed to retrieve new Product ID from transaction receipt or via fallback method.");
                }
            }

            // 4. Final step: Refresh the dashboard data
            // CRITICAL FIX: Pass BOTH the hash AND the ID to the parent fetch function
            if (onProductAdded) {
                await onProductAdded(realTxHash, newProductId);
            }

            setMessage(`✅ Success! Product ID ${newProductId} added. TxHash: ${realTxHash.substring(0, 10)}... Dashboard refreshed.`);
            
            // Clear form
            setName('');
            setOrigin('');
            setQuantity('');
            setPrice('');
            
        } catch (error) {
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
                
                {/* NEW FIELDS */}
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
                            <option value="tonnes">Tonnes</option>
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

                <div className="form-group">
                    <label>Expiry Date:</label>
                    <input 
                        type="date" 
                        value={expiryDate} 
                        onChange={(e) => setExpiryDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]} // Set minimum date to today
                    />
                </div>
                {/* END NEW FIELDS */}

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
