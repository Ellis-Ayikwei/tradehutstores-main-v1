'use client';

import { useState } from 'react';

interface SidebarProps {
    categories: string[];
    brands: string[];
    onCategoryChange: (categories: string[]) => void;
    onBrandChange: (brands: string[]) => void;
    onPriceChange: (range: [number, number]) => void;
    onConditionChange?: (conditions: string[]) => void;
    onAvailabilityChange?: (availability: string[]) => void;
}

export default function Sidebar({ categories, brands, onCategoryChange, onBrandChange, onPriceChange, onConditionChange, onAvailabilityChange }: SidebarProps) {
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
    const conditions = ['New', 'Used - Like New', 'Used - Good', 'Used - Fair', 'Refurbished'];
    const availability = ['In Stock', 'Out of Stock', 'Pre-order'];

    const handlePriceChange = (value: [number, number]) => {
        setPriceRange(value);
        onPriceChange(value);
    };

    return (
        <div className="space-y-6">
            {/* Categories */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Categories</h3>
                <div className="space-y-2">
                    {categories.map((category) => (
                        <label key={category} className="flex items-center">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-[#dc711a] focus:ring-[#dc711a]"
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    onCategoryChange(isChecked ? [...categories, category] : categories.filter((c) => c !== category));
                                }}
                            />
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{category}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Brands */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Brands</h3>
                <div className="space-y-2">
                    {brands.map((brand) => (
                        <label key={brand} className="flex items-center">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-[#dc711a] focus:ring-[#dc711a]"
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    onBrandChange(isChecked ? [...brands, brand] : brands.filter((b) => b !== brand));
                                }}
                            />
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{brand}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Condition */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Condition</h3>
                <div className="space-y-2">
                    {conditions.map((condition) => (
                        <label key={condition} className="flex items-center">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-[#dc711a] focus:ring-[#dc711a]"
                                onChange={(e) => {
                                    if (onConditionChange) {
                                        const isChecked = e.target.checked;
                                        onConditionChange(isChecked ? [...conditions, condition] : conditions.filter((c) => c !== condition));
                                    }
                                }}
                            />
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{condition}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Availability */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Availability</h3>
                <div className="space-y-2">
                    {availability.map((status) => (
                        <label key={status} className="flex items-center">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-[#dc711a] focus:ring-[#dc711a]"
                                onChange={(e) => {
                                    if (onAvailabilityChange) {
                                        const isChecked = e.target.checked;
                                        onAvailabilityChange(isChecked ? [...availability, status] : availability.filter((a) => a !== status));
                                    }
                                }}
                            />
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{status}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Price Range</h3>
                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <input
                            type="number"
                            min="0"
                            max={priceRange[1]}
                            value={priceRange[0]}
                            onChange={(e) => handlePriceChange([Number(e.target.value), priceRange[1]])}
                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-[#dc711a] focus:ring-[#dc711a]"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                            type="number"
                            min={priceRange[0]}
                            value={priceRange[1]}
                            onChange={(e) => handlePriceChange([priceRange[0], Number(e.target.value)])}
                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-[#dc711a] focus:ring-[#dc711a]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
