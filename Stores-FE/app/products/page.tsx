'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { fetchProducts } from '@/store/productSlice'
import MainLayout from '@/components/Layouts/MainLayout'
import ProductCard from '@/components/Products/ProductCard'
import Sidebar from '@/components/Navigation/Sidebar'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { Select, Pagination, Empty, Breadcrumb } from 'antd'
import { Grid3x3, List, Home } from 'lucide-react'
import Link from 'next/link'

const { Option } = Select

export default function ProductsPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { allProducts, isUpdating } = useSelector((state: RootState) => state.products)
    
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [sortBy, setSortBy] = useState('featured')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(12)
    const [filteredProducts, setFilteredProducts] = useState(allProducts)

    useEffect(() => {
        dispatch(fetchProducts())
    }, [dispatch])

    useEffect(() => {
        setFilteredProducts(allProducts)
    }, [allProducts])

    const handleCategoryChange = (categories: string[]) => {
        // Filter logic here
        console.log('Categories:', categories)
    }

    const handleBrandChange = (brands: string[]) => {
        // Filter logic here
        console.log('Brands:', brands)
    }

    const handlePriceChange = (range: [number, number]) => {
        // Filter logic here
        console.log('Price range:', range)
    }

    const handleSortChange = (value: string) => {
        setSortBy(value)
        // Sort logic here
    }

    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    )

    return (
        <MainLayout>
            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <Breadcrumb className="mb-6">
                    <Breadcrumb.Item>
                        <Link href="/" className="flex items-center gap-1">
                            <Home className="h-4 w-4" />
                            Home
                        </Link>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>Products</Breadcrumb.Item>
                </Breadcrumb>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <Sidebar
                            categories={['Electronics', 'Clothing', 'Home', 'Sports', 'Books']}
                            brands={['Apple', 'Samsung', 'Nike', 'Adidas', 'Sony']}
                            onCategoryChange={handleCategoryChange}
                            onBrandChange={handleBrandChange}
                            onPriceChange={handlePriceChange}
                        />
                    </aside>

                    {/* Products Section */}
                    <section className="flex-1">
                        {/* Header Controls */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        Showing {paginatedProducts.length} of {filteredProducts.length} products
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Sort Dropdown */}
                                    <Select
                                        value={sortBy}
                                        onChange={handleSortChange}
                                        style={{ width: 180 }}
                                    >
                                        <Option value="featured">Featured</Option>
                                        <Option value="price-low">Price: Low to High</Option>
                                        <Option value="price-high">Price: High to Low</Option>
                                        <Option value="rating">Highest Rated</Option>
                                        <Option value="newest">Newest First</Option>
                                    </Select>

                                    {/* View Mode Toggle */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-2 rounded ${
                                                viewMode === 'grid'
                                                    ? 'bg-primary-500 text-white'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                        >
                                            <Grid3x3 className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-2 rounded ${
                                                viewMode === 'list'
                                                    ? 'bg-primary-500 text-white'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                        >
                                            <List className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Products Grid/List */}
                        {isUpdating ? (
                            <LoadingSpinner text="Loading products..." />
                        ) : paginatedProducts.length > 0 ? (
                            <>
                                <div className={`grid gap-6 ${
                                    viewMode === 'grid'
                                        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                                        : 'grid-cols-1'
                                }`}>
                                    {paginatedProducts.map((product: any) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div className="mt-8 flex justify-center">
                                    <Pagination
                                        current={currentPage}
                                        total={filteredProducts.length}
                                        pageSize={pageSize}
                                        onChange={(page) => setCurrentPage(page)}
                                        showSizeChanger
                                        onShowSizeChange={(current, size) => {
                                            setPageSize(size)
                                            setCurrentPage(1)
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            <Empty 
                                description="No products found"
                                className="py-16"
                            />
                        )}
                    </section>
                </div>
            </div>
        </MainLayout>
    )
}