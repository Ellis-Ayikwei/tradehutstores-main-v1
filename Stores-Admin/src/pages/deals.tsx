'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Deal {
    id: string;
    name: string;
    price: number;
    originalPrice: number;
    image: string;
    category: string;
    discountPercentage: number;
    endsAt: string;
    description: string;
    rating: number;
}

export default function Deals() {
    const [deals] = useState<Deal[]>([
        {
            id: '1',
            name: 'iPhone 15 Pro Max',
            price: 999,
            originalPrice: 1199,
            image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569',
            category: 'Phones',
            discountPercentage: 17,
            endsAt: '2024-04-01',
            description: 'Latest iPhone with revolutionary features',
            rating: 4.8,
        },
        {
            id: '2',
            name: 'MacBook Air M2',
            price: 999,
            originalPrice: 1299,
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
            category: 'Laptops',
            discountPercentage: 23,
            endsAt: '2024-04-01',
            description: 'Supercharged by M2 chip',
            rating: 4.9,
        },
        {
            id: '3',
            name: 'Sony WH-1000XM5',
            price: 299,
            originalPrice: 399,
            image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb',
            category: 'Audio',
            discountPercentage: 25,
            endsAt: '2024-04-01',
            description: 'Industry-leading noise cancellation',
            rating: 4.7,
        },
        {
            id: '4',
            name: 'Samsung Galaxy S24 Ultra',
            price: 899,
            originalPrice: 1199,
            image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf',
            category: 'Phones',
            discountPercentage: 25,
            endsAt: '2024-04-01',
            description: 'Ultimate Android experience',
            rating: 4.8,
        },
        {
            id: '5',
            name: 'iPad Pro 12.9"',
            price: 899,
            originalPrice: 1099,
            image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0',
            category: 'Tablets',
            discountPercentage: 18,
            endsAt: '2024-04-01',
            description: 'Your next computer is not a computer',
            rating: 4.9,
        },
        {
            id: '6',
            name: 'Dell XPS 15',
            price: 1499,
            originalPrice: 1899,
            image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45',
            category: 'Laptops',
            discountPercentage: 21,
            endsAt: '2024-04-01',
            description: 'Premium Windows experience',
            rating: 4.6,
        },
    ]);

    return (
        <div className="max-w-screen-xl mx-auto px-4 py-8">
            {/* Header Section with enhanced animation */}
            <div className="text-center mb-16 relative">
                <div className="absolute inset-0 -top-8 bg-gradient-to-r from-primary-500/10 to-primary-600/10 blur-3xl rounded-full" />
                <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary-500 to-primary-600 text-transparent bg-clip-text relative animate-fade-in">Epic Deals & Discounts</h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto relative">Discover incredible savings on premium tech - Limited time offers just for you!</p>
            </div>

            {/* Enhanced Featured Deal */}
            <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-3xl p-8 mb-16 shadow-2xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-transparent" />

                <div className="grid md:grid-cols-2 gap-12 items-center relative">
                    <div className="space-y-8">
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="inline-flex items-center bg-white/95 text-primary-500 px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                                <span className="animate-pulse mr-2">🔥</span>
                                Featured Deal
                            </span>
                            <span className="inline-flex items-center bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-bounce">
                                Save ${deals[0].originalPrice - deals[0].price}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-5xl font-bold text-white leading-tight">{deals[0].name}</h2>
                            <p className="text-white/90 text-xl leading-relaxed">{deals[0].description}</p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-baseline gap-4">
                                <span className="text-6xl font-bold text-white tracking-tight">${deals[0].price}</span>
                                <span className="text-3xl text-white/60 line-through">${deals[0].originalPrice}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className={`text-2xl ${i < Math.floor(deals[0].rating) ? 'text-yellow-400 animate-twinkle' : 'text-white/30'}`}>
                                        ★
                                    </span>
                                ))}
                                <span className="text-white/90 ml-2 text-lg">{deals[0].rating}/5</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <button className="group bg-white text-primary-500 px-8 py-4 rounded-xl font-semibold hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl">
                                <span className="flex items-center gap-2">
                                    Buy Now
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </span>
                            </button>
                            <button className="group border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                                <span className="flex items-center gap-2">
                                    Learn More
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="relative h-[600px] rounded-2xl overflow-hidden group">
                        {/* Glass effect overlay */}
                        <div
                            className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl 
                            group-hover:backdrop-blur-none transition-all duration-500"
                        />

                        {/* Product image */}
                        <img
                            src={deals[0].image}
                            alt={deals[0].name}
                            className="absolute inset-0 w-full h-full object-cover rounded-2xl transform 
                                group-hover:scale-110 transition-transform duration-700 ease-out"
                        />

                        {/* Floating badges */}
                        <div className="absolute top-4 right-4 flex flex-col gap-3 transform translate-x-12 group-hover:translate-x-0 transition-transform duration-500">
                            <span className="bg-green-500/90 text-white px-4 py-2 rounded-lg backdrop-blur-sm text-sm font-medium">Free Shipping</span>
                            <span className="bg-blue-500/90 text-white px-4 py-2 rounded-lg backdrop-blur-sm text-sm font-medium">2 Year Warranty</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* All Deals Grid */}
            <div className="space-y-8">
                <h2 className="text-3xl font-bold dark:text-white">More Hot Deals</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {deals.slice(1).map((deal) => (
                        <div key={deal.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
                            <div className="relative">
                                <Link to={`/products/${deal.id}`}>
                                    <img src={deal.image} alt={deal.name} className="w-full h-56 object-cover transform group-hover:scale-105 transition-transform duration-500" />
                                </Link>
                                <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">-{deal.discountPercentage}%</div>
                            </div>
                            <div className="p-6">
                                <div className="mb-4">
                                    <h3 className="font-semibold text-xl mb-2 dark:text-white">{deal.name}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">{deal.description}</p>
                                </div>
                                <div className="flex items-baseline gap-2 mb-4">
                                    <span className="text-2xl font-bold text-primary-500">${deal.price}</span>
                                    <span className="text-gray-500 line-through">${deal.originalPrice}</span>
                                    <span className="text-green-500 text-sm ml-auto">Save ${deal.originalPrice - deal.price}</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={i < Math.floor(deal.rating) ? 'text-yellow-400' : 'text-gray-300'}>
                                                    ★
                                                </span>
                                            ))}
                                        </div>
                                        <span className="text-gray-500 dark:text-gray-400">Ends: {new Date(deal.endsAt).toLocaleDateString()}</span>
                                    </div>
                                    <button className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors">Add to Cart</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
