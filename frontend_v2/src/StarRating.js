// File: src/StarRating.js
import React, { useState } from 'react';
import './StarRating.css'; // We'll create this CSS file next

const StarRating = ({ onRate, loading }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);

    const handleSubmit = () => {
        if (rating > 0 && !loading) {
            onRate(rating);
        }
    };

    return (
        <div className="rating-container">
            <div className="stars">
                {[...Array(5)].map((star, index) => {
                    const ratingValue = index + 1;
                    return (
                        <button
                            type="button"
                            key={ratingValue}
                            className={ratingValue <= (hover || rating) ? "on" : "off"}
                            onClick={() => setRating(ratingValue)}
                            onMouseEnter={() => setHover(ratingValue)}
                            onMouseLeave={() => setHover(0)}
                            disabled={loading}
                        >
                            <span className="star">&#9733;</span>
                        </button>
                    );
                })}
            </div>
            <button
                className="button-action button-rate"
                onClick={handleSubmit}
                disabled={loading || rating === 0}
            >
                Rate
            </button>
        </div>
    );
};

export default StarRating;
