'use client'

import { useState } from 'react'
import { Search, Camera } from 'lucide-react'
import { Button } from 'antd'
import { useRouter } from 'next/navigation'

interface SearchBarProps {
    variant?: 'hero' | 'navbar'
    className?: string
}

export default function SearchBar({ variant = 'hero', className = '' }: SearchBarProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const router = useRouter()

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/products?search=${encodeURIComponent(searchQuery)}`)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    if (variant === 'navbar') {
        return (
            <div className={`flex-1 max-w-2xl ${className}`}>
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Search for products..."
                            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400"
                        />
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={className}>
            <div className="mb-3">
                <label className="block text-left text-gray-700 font-medium mb-3">
                    What are you looking for?
                </label>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Search for products..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                        />
                    </div>

                    {/* Image Search Button */}
                    <Button
                        className="h-12 px-4 border-2 border-gray-300 hover:border-primary-500 rounded-lg flex items-center justify-center"
                        icon={<Camera className="h-5 w-5 text-gray-600" />}
                    />

                    {/* Search Button */}
                    <Button
                        type="primary"
                        onClick={handleSearch}
                        className="h-12 px-8 bg-primary-500 hover:bg-primary-600 border-0 rounded-lg font-semibold text-white shadow-lg"
                        icon={<Search className="h-5 w-5" />}
                    >
                        Search
                    </Button>
                </div>
            </div>
        </div>
    )
}

