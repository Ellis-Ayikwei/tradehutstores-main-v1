'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { Slider, Checkbox, Radio } from 'antd'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'

interface SidebarProps {
    categories: string[]
    brands: string[]
    onCategoryChange: (categories: string[]) => void
    onBrandChange: (brands: string[]) => void
    onPriceChange: (range: [number, number]) => void
}

export default function Sidebar({
    categories,
    brands,
    onCategoryChange,
    onBrandChange,
    onPriceChange,
}: SidebarProps) {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedBrands, setSelectedBrands] = useState<string[]>([])
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        brands: true,
        price: true,
        rating: false,
        condition: false,
    })

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }))
    }

    const handleCategoryChange = (category: string, checked: boolean) => {
        const updated = checked
            ? [...selectedCategories, category]
            : selectedCategories.filter(c => c !== category)
        setSelectedCategories(updated)
        onCategoryChange(updated)
    }

    const handleBrandChange = (brand: string, checked: boolean) => {
        const updated = checked
            ? [...selectedBrands, brand]
            : selectedBrands.filter(b => b !== brand)
        setSelectedBrands(updated)
        onBrandChange(updated)
    }

    const handlePriceChange = (value: number | number[]) => {
        if (Array.isArray(value)) {
            setPriceRange(value as [number, number])
            onPriceChange(value as [number, number])
        }
    }

    return (
        <div className="w-full lg:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-6">
                <Filter className="h-5 w-5 mr-2 text-primary-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filters</h2>
            </div>

            {/* Categories */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('categories')}
                    className="flex items-center justify-between w-full mb-3"
                >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Categories</h3>
                    {expandedSections.categories ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                </button>
                {expandedSections.categories && (
                    <div className="space-y-2">
                        {categories.map(category => (
                            <label key={category} className="flex items-center cursor-pointer">
                                <Checkbox
                                    checked={selectedCategories.includes(category)}
                                    onChange={(e: CheckboxChangeEvent) => 
                                        handleCategoryChange(category, e.target.checked)
                                    }
                                />
                                <span className="ml-2 text-gray-700 dark:text-gray-300">{category}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Brands */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('brands')}
                    className="flex items-center justify-between w-full mb-3"
                >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Brands</h3>
                    {expandedSections.brands ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                </button>
                {expandedSections.brands && (
                    <div className="space-y-2">
                        {brands.map(brand => (
                            <label key={brand} className="flex items-center cursor-pointer">
                                <Checkbox
                                    checked={selectedBrands.includes(brand)}
                                    onChange={(e: CheckboxChangeEvent) => 
                                        handleBrandChange(brand, e.target.checked)
                                    }
                                />
                                <span className="ml-2 text-gray-700 dark:text-gray-300">{brand}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Price Range */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('price')}
                    className="flex items-center justify-between w-full mb-3"
                >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Price Range</h3>
                    {expandedSections.price ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                </button>
                {expandedSections.price && (
                    <div>
                        <Slider
                            range
                            min={0}
                            max={5000}
                            value={priceRange}
                            onChange={handlePriceChange}
                            className="mb-2"
                        />
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>${priceRange[0]}</span>
                            <span>${priceRange[1]}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Rating */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('rating')}
                    className="flex items-center justify-between w-full mb-3"
                >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Rating</h3>
                    {expandedSections.rating ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                </button>
                {expandedSections.rating && (
                    <div className="space-y-2">
                        {[4, 3, 2, 1].map(rating => (
                            <label key={rating} className="flex items-center cursor-pointer">
                                <Radio name="rating" />
                                <span className="ml-2 text-gray-700 dark:text-gray-300">
                                    {rating}+ Stars
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Condition */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('condition')}
                    className="flex items-center justify-between w-full mb-3"
                >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Condition</h3>
                    {expandedSections.condition ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                </button>
                {expandedSections.condition && (
                    <div className="space-y-2">
                        {['New', 'Like New', 'Good', 'Fair'].map(condition => (
                            <label key={condition} className="flex items-center cursor-pointer">
                                <Checkbox />
                                <span className="ml-2 text-gray-700 dark:text-gray-300">{condition}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Clear Filters Button */}
            <button
                onClick={() => {
                    setSelectedCategories([])
                    setSelectedBrands([])
                    setPriceRange([0, 1000])
                    onCategoryChange([])
                    onBrandChange([])
                    onPriceChange([0, 1000])
                }}
                className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
                Clear All Filters
            </button>
        </div>
    )
}