'use client';

import { faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { Card } from '../ui/Card';

interface FilterSidebarProps {
    // Add your filter props here
}

export default function FilterSidebar({}: FilterSidebarProps) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    return (
        <>
            {/* Mobile Filter Toggle Button */}
            <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="lg:hidden fixed bottom-6 left-6 z-50 p-4 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 transition-all"
            >
                <FontAwesomeIcon icon={isFilterOpen ? faTimes : faFilter} className="w-6 h-6" />
            </button>

            {/* Mobile Filter Overlay */}
            {isFilterOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsFilterOpen(false)} />}

            {/* Filter Sidebar */}
            <Card
                className={`fixed lg:sticky lg:top-4 h-[calc(100vh-2rem)] lg:h-auto overflow-y-auto transform transition-transform duration-300 ease-in-out z-50 lg:z-0 lg:transform-none ${
                    isFilterOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                <div className="flex justify-between items-center lg:hidden mb-4">
                    <h2 className="text-lg font-semibold">Filters</h2>
                    <button onClick={() => setIsFilterOpen(false)}>
                        <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                    </button>
                </div>

                {/* Your existing filter content goes here */}
                <div className="space-y-6">
                    {/* Price Range */}
                    <div>
                        <h3 className="font-medium mb-2">Price Range</h3>
                        {/* Add price range inputs */}
                    </div>

                    {/* Categories */}
                    <div>
                        <h3 className="font-medium mb-2">Categories</h3>
                        {/* Add category checkboxes */}
                    </div>

                    {/* Brands */}
                    <div>
                        <h3 className="font-medium mb-2">Brands</h3>
                        {/* Add brand checkboxes */}
                    </div>

                    {/* Ratings */}
                    <div>
                        <h3 className="font-medium mb-2">Ratings</h3>
                        {/* Add rating options */}
                    </div>
                </div>
            </Card>
        </>
    );
}
