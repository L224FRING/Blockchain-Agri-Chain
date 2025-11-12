import React from 'react';
import { ethers } from 'ethers';
import { ROLE_MANAGER_ADDRESS, ROLE_MANAGER_ABI } from './config';

// This is the component moved from Dashboard.js
const RatingBadge = ({ userAddress, label }) => {
    const [avg, setAvg] = React.useState(null);
    const [count, setCount] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const run = async () => {
            if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000') return;
            if (!window.ethereum) return;
            setLoading(true);
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const roleManager = new ethers.Contract(ROLE_MANAGER_ADDRESS, ROLE_MANAGER_ABI, provider);
                const [average, numRatings] = await roleManager.getAverageRating(userAddress);
                setAvg(Number(average));
                setCount(Number(numRatings));
            } catch (e) {
                console.warn('Failed to load rating:', e);
                setAvg(null);
                setCount(null);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [userAddress]);

    if (!userAddress) return null;
    
    // Title attribute shows the full address on hover
    return (
        <span className="rating-badge" title={userAddress}>
            {label}{loading ? '... ⭐️' : (avg ? `${avg}/5 ★ (${count})` : 'Not Rated')}
        </span>
    );
};

export default RatingBadge;
