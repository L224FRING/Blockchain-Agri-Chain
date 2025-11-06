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
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Utility to parse logs and find the emitted ID
    const getProductIdFromReceipt = (receipt) => {
        // Create an interface instance using the ABI
        const contractInterface = new ethers.Interface(SUPPLY_CHAIN_ABI);
        
        // Loop through all logs in the receipt
        for (const log of receipt.logs) {
            try {
                // Try to parse the log data using the contract interface
                const parsedLog = contractInterface.parseLog(log);
                
                // Check if the event name matches the one we're looking for
                if (parsedLog && parsedLog.name === 'ProductAdded') {
                    // The Product ID is the first argument in the event data (id)
                    const id = parsedLog.args.id;
                    // Return the ID as a standard JavaScript number
                    return Number(id);
                }
            } catch (e) {
                // Ignore logs that don't belong to this contract interface
            }
        }
        return null; // Return null if ID not found
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

            // 3. Transaction 1: Add the product
            setMessage('Waiting for addProduct transaction signature...');
            const tx = await contract.addProduct(name, origin, quantityInUnits, unit, priceInUnits);
            
            setMessage(`Transaction submitted. Waiting for confirmation... TxHash: ${tx.hash.substring(0, 10)}...`);
            const receipt = await tx.wait(); // Wait for mining confirmation
            
            const realTxHash = receipt.hash;
            
            // CRITICAL FIX: Get the exact product ID from the log
            const newProductId = getProductIdFromReceipt(receipt);
            if (!newProductId) {
                 throw new Error("Failed to retrieve new Product ID from transaction receipt.");
            }

            // 4. Final step: Refresh the dashboard data
            // CRITICAL FIX: Pass BOTH the hash AND the ID to the parent fetch function
            await onProductAdded(realTxHash, newProductId); 

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
