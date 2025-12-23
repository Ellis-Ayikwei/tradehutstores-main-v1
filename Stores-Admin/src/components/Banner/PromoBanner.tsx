'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const banners = [
    {
        id: 1,
        title: 'iPhone 15 Pro Max',
        description: 'Experience the power of A17 Pro chip',
        image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569',
        link: '/products/iphone-15',
        color: 'from-gray-900 to-gray-800',
    },
    {
        id: 2,
        title: 'Gaming Paradise',
        description: 'Up to 40% off on gaming laptops',
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7',
        link: '/category/laptops',
        color: 'from-purple-600 to-indigo-700',
    },
    {
        id: 3,
        title: 'Summer Sale',
        description: 'Save big on latest gadgets',
        image: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1',
        link: '/deals',
        color: 'from-[#dc711a] to-[#B95D13FF]',
    },
];

export default function PromoBanner() {
    const [currentBanner, setCurrentBanner] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentBanner((prev) => (prev + 1) % banners.length);
        }, 5000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative h-[300px] md:h-[400px] overflow-hidden rounded-2xl">
            {banners.map((banner, index) => (
                <div key={banner.id} className={`absolute inset-0 transition-opacity duration-500 ${index === currentBanner ? 'opacity-100' : 'opacity-0'}`}>
                    <div className={`absolute inset-0 bg-gradient-to-r ${banner.color} opacity-90`} />
                    <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center">
                        <div className="max-w-screen-xl mx-auto px-4 w-full">
                            <div className="max-w-lg">
                                <h2 className="text-4xl font-bold text-white mb-4">{banner.title}</h2>
                                <p className="text-xl text-white/90 mb-8">{banner.description}</p>
                                <Link to={banner.link} className="inline-block bg-white text-[#dc711a] px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors">
                                    Shop Now
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {banners.map((_, index) => (
                    <button key={index} onClick={() => setCurrentBanner(index)} className={`w-2 h-2 rounded-full transition-colors ${index === currentBanner ? 'bg-white' : 'bg-white/50'}`} />
                ))}
            </div>
        </div>
    );
}
