'use client';

import { useState } from 'react';

interface Review {
    id: number;
    name: string;
    rating: number;
    comment: string;
}

interface ProductReviewProps {
    reviews: Review[];
    onAddReview: (review: Review) => void;
}

const ProductReview: React.FC<ProductReviewProps> = ({ reviews, onAddReview }) => {
    const [name, setName] = useState('');
    const [rating, setRating] = useState(1);
    const [comment, setComment] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newReview = {
            id: Date.now(),
            name,
            rating,
            comment,
        };
        onAddReview(newReview);
        setName('');
        setRating(1);
        setComment('');
    };

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
            <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex gap-4 mb-4">
                    <input type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="border border-gray-300 rounded-md p-2 flex-1" required />
                    <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border border-gray-300 rounded-md p-2" required>
                        <option value={1}>1 Star</option>
                        <option value={2}>2 Stars</option>
                        <option value={3}>3 Stars</option>
                        <option value={4}>4 Stars</option>
                        <option value={5}>5 Stars</option>
                    </select>
                </div>
                <textarea placeholder="Your Review" value={comment} onChange={(e) => setComment(e.target.value)} className="border border-gray-300 rounded-md p-2 w-full" rows={4} required />
                <button type="submit" className="mt-4 bg-[#dc711a] text-white px-4 py-2 rounded-md hover:bg-[#dc711a]/90">
                    Submit Review
                </button>
            </form>

            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <p>No reviews yet.</p>
                ) : (
                    reviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-300 py-4">
                            <h3 className="font-semibold">{review.name}</h3>
                            <div className="flex items-center">
                                {[...Array(review.rating)].map((_, i) => (
                                    <span key={i} className="text-yellow-400">
                                        ★
                                    </span>
                                ))}
                                {[...Array(5 - review.rating)].map((_, i) => (
                                    <span key={i} className="text-gray-300">
                                        ★
                                    </span>
                                ))}
                            </div>
                            <p className="text-gray-600">{review.comment}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ProductReview;
