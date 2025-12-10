'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Category {
    id: string;
    name: string;
    image: string;
    productCount: number;
}

export default function Categories() {
    const [categories] = useState<Category[]>([
        {
            id: 'phones',
            name: 'Phones',
            image: '/assets/images/categories/phones.jpg',
            productCount: 120,
        },
        {
            id: 'laptops',
            name: 'Laptops',
            image: '/assets/images/categories/laptops.jpg',
            productCount: 85,
        },
        {
            id: 'accessories',
            name: 'Accessories',
            image: '/assets/images/categories/accessories.jpg',
            productCount: 200,
        },
        // Add more categories as needed
    ]);

    return (
        <div className="max-w-screen-xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-8 dark:text-white">Categories</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => (
                    <Link key={category.id} to={`/products?category=${category.id}`} className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
                        <div className="aspect-video w-full">
                            <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                            <div className="absolute bottom-0 p-4">
                                <h3 className="text-xl font-bold text-white">{category.name}</h3>
                                <p className="text-white/80">{category.productCount} Products</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
