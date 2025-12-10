'use client';

import { faHeart, faShoppingCart, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface WishlistItem {
    id: string;
    name: string;
    price: number;
    image: string;
    brand: string;
    inStock: boolean;
    rating: number;
}

export default function Wishlist() {
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([
        {
            id: '1',
            name: 'MacBook Pro 16"',
            price: 2499.99,
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
            brand: 'Apple',
            inStock: true,
            rating: 4.9,
        },
        // Add more items...
    ]);

    const removeFromWishlist = (id: string) => {
        setWishlistItems((prev) => prev.filter((item) => item.id !== id));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Wishlist</h1>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{wishlistItems.length} items</span>
                </div>
            </div>

            {wishlistItems.length === 0 ? (
                <Card className="text-center py-12">
                    <FontAwesomeIcon icon={faHeart} className="text-6xl text-gray-300 dark:text-gray-600 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Your wishlist is empty</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Start adding items you love!</p>
                    <Button variant="primary" size="lg" className="animate-float">
                        Explore Products
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlistItems.map((item) => (
                        <Card key={item.id} className="relative group">
                            <div className="absolute top-4 right-4 z-10 space-x-2">
                                <button onClick={() => removeFromWishlist(item.id)} className="p-2 bg-white dark:bg-crypto-card rounded-full shadow-lg hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faTrash} className="text-red-500 w-4 h-4" />
                                </button>
                            </div>
                            <div className="relative aspect-square mb-4 overflow-hidden rounded-lg">
                                <img src={item.image} alt={item.name} className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300" />
                                {!item.inStock && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                        <span className="text-white font-semibold">Out of Stock</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.brand}</p>
                                    </div>
                                    <p className="text-lg font-bold text-primary-500">${item.price.toLocaleString()}</p>
                                </div>
                                <div className="flex items-center space-x-1">
                                    {[...Array(5)].map((_, i) => (
                                        <span key={i} className={`text-sm ${i < Math.floor(item.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                                            ★
                                        </span>
                                    ))}
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{item.rating}</span>
                                </div>
                                <Button variant="primary" className="w-full mt-4" disabled={!item.inStock}>
                                    <FontAwesomeIcon icon={faShoppingCart} className="mr-2" />
                                    Add to Cart
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
