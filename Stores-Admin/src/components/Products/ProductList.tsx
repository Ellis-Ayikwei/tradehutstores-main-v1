'use client';

import { useState } from 'react';
import ProductCard from './ProductCard';

interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
    brand: string;
}

interface ProductListProps {
    products: Product[];
    selectedCategories: string[];
    selectedBrands: string[];
    priceRange: [number, number];
}

export default function ProductList({ products, selectedCategories, selectedBrands, priceRange }: ProductListProps) {
    const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'name'>('price-asc');

    const filteredProducts = products.filter((product) => {
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
        const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(product.brand);
        const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];

        return matchesCategory && matchesBrand && matchesPrice;
    });

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case 'price-asc':
                return a.price - b.price;
            case 'price-desc':
                return b.price - a.price;
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Products ({filteredProducts.length})</h2>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="border rounded-md px-3 py-1">
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name">Name</option>
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedProducts.map((product) => (
                    <ProductCard key={product.id} {...product} />
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-10">
                    <p className="text-gray-500">No products match your filters</p>
                </div>
            )}
        </div>
    );
}
