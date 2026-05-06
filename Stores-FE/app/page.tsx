'use client'

import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { fetchFeaturedProducts, fetchPopularProducts, fetchNewArrivals } from '@/store/productSlice'
import MainLayout from '@/components/Layouts/MainLayout'
import ProductCard from '@/components/Products/ProductCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import HeroWithSearch from '@/components/Home/HeroWithSearch'
import Categories from '@/components/Home/Categories'
import HomeMerchandising from '@/components/Home/HomeMerchandising'
import { Button } from 'antd'
import Link from 'next/link'
import { 
    ArrowRight, 
    Package, 
    Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import { dummyProducts, getFlashSaleProducts, getProductsByCategory, getRandomProducts } from '@/lib/dummyProducts'

export default function HomePage() {
    const dispatch = useDispatch<AppDispatch>()
    const { featuredProducts, popularProducts, newArrivals, isUpdating } = useSelector((state: RootState) => state.products)

    useEffect(() => {
        dispatch(fetchFeaturedProducts())
        dispatch(fetchPopularProducts())
        dispatch(fetchNewArrivals())
    }, [dispatch])

    // Use API data if available, otherwise use dummy data
    const displayFeaturedProducts = useMemo(() => {
        return featuredProducts && featuredProducts.length > 0 
            ? featuredProducts 
            : getRandomProducts(18)
    }, [featuredProducts])

    const displayPopularProducts = useMemo(() => {
        return popularProducts && popularProducts.length > 0 
            ? popularProducts 
            : getRandomProducts(18)
    }, [popularProducts])

    const displayNewArrivals = useMemo(() => {
        return newArrivals && newArrivals.length > 0 
            ? newArrivals 
            : getRandomProducts(18)
    }, [newArrivals])

    const displayFlashSales = useMemo(() => {
        return getFlashSaleProducts(12)
    }, [])

    const displayElectronics = useMemo(() => {
        return getProductsByCategory('Electronics', 12)
    }, [])

    const displayHomeAppliances = useMemo(() => {
        return getProductsByCategory('Home Appliances', 12)
    }, [])

    const displayFashion = useMemo(() => {
        return getProductsByCategory('Fashion', 12)
    }, [])

    const categories = [
        { name: 'Electronics', image: '/assets/images/categories/Computing & Peripherals.avif', count: 1240 },
        { name: 'Fashion', image: '/assets/images/categories/Clothing & Apparel.avif', count: 856 },
        { name: 'Home & Living', image: '/assets/images/categories/Furniture & Interior.avif', count: 642 },
        { name: 'Sports', image: '/assets/images/categories/Sports & Outdoor.avif', count: 423 },
    ]

    return (
        <MainLayout>
            {/* Hero Section with Search */}
            <HeroWithSearch />

            <HomeMerchandising />

           

            {/* Flash Sales Section */}
            <section className="relative py-2 bg-red-50 dark:bg-gray-900  z-10 md:w-[80%] mx-auto rounded-md">
                <div className="container mx-auto px-4">
                    <div className="bg-gray-900 dark:bg-gray-950 px-6 py-4 rounded-lg mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-4 md:gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded">
                                    <Zap className="h-5 w-5 md:h-6 md:w-6 text-orange-500" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold text-white">
                                    Flash Sales
                                </h2>
                            </div>
                            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-900 rounded border border-gray-700">
                                <span className="text-xs text-gray-400">Ends in:</span>
                                <span className="text-sm font-mono font-bold text-orange-500">07h : 43m : 05s</span>
                            </div>
                        </div>
                        <Link href="/flash-sales">
                            <Button 
                                type="link" 
                                className="text-orange-500 hover:text-orange-400 font-semibold text-sm md:text-base"
                                icon={<ArrowRight className="h-4 w-4 md:h-5 md:w-5" />}
                                iconPosition="end"
                            >
                                View All
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="relative">
                        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <style jsx>{`
                                div::-webkit-scrollbar {
                                    display: none;
                                }
                            `}</style>
                            {displayFlashSales.slice(0, 12).map((product: any, index: number) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex-shrink-0 w-[calc(50%-0.25rem)] sm:w-[calc(33.333%-0.5rem)] md:w-auto"
                                >
                                    <ProductCard product={product} />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <Categories />

            {/* Top Deals Section */}
            <section className="py-12 bg-white dark:bg-gray-900">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                Deals You Don't Want to Miss
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Up to 80% off
                            </p>
                        </div>
                        <Link href="/deals">
                            <Button 
                                type="link" 
                                className="text-primary-500 hover:text-primary-600 font-semibold"
                                icon={<ArrowRight className="h-5 w-5" />}
                                iconPosition="end"
                            >
                                See All
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style jsx>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        {displayPopularProducts.slice(0, 18).map((product: any, index: number) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="flex-shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.67rem)] md:w-auto"
                            >
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Phones & Tablets */}
            <section className="py-12 bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                Phones & Tablets
                            </h2>
                        </div>
                        <Link href="/products?category=phones-tablets">
                            <Button 
                                type="link" 
                                className="text-primary-500 hover:text-primary-600 font-semibold"
                                icon={<ArrowRight className="h-5 w-5" />}
                                iconPosition="end"
                            >
                                See All
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style jsx>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        {displayElectronics.slice(0, 12).map((product: any, index: number) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="flex-shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.67rem)] md:w-auto"
                            >
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Electronics */}
            <section className="py-12 bg-white dark:bg-gray-900">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                Electronics
                            </h2>
                        </div>
                        <Link href="/products?category=electronics">
                            <Button 
                                type="link" 
                                className="text-primary-500 hover:text-primary-600 font-semibold"
                                icon={<ArrowRight className="h-5 w-5" />}
                                iconPosition="end"
                            >
                                See All
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style jsx>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        {displayElectronics.slice(0, 12).map((product: any, index: number) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="flex-shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.67rem)] md:w-auto"
                            >
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Home & Office */}
            <section className="py-12 bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                Home & Office
                            </h2>
                        </div>
                        <Link href="/products?category=home-office">
                            <Button 
                                type="link" 
                                className="text-primary-500 hover:text-primary-600 font-semibold"
                                icon={<ArrowRight className="h-5 w-5" />}
                                iconPosition="end"
                            >
                                See All
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style jsx>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        {displayHomeAppliances.slice(0, 12).map((product: any, index: number) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="flex-shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.67rem)] md:w-auto"
                            >
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Fashion */}
            <section className="py-12 bg-white dark:bg-gray-900">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                Fashion
                            </h2>
                        </div>
                        <Link href="/products?category=fashion">
                            <Button 
                                type="link" 
                                className="text-primary-500 hover:text-primary-600 font-semibold"
                                icon={<ArrowRight className="h-5 w-5" />}
                                iconPosition="end"
                            >
                                See All
                            </Button>
                        </Link>
                    </div>
                    
                    {isUpdating ? (
                        <LoadingSpinner text="Loading fashion..." />
                    ) : (
                        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <style jsx>{`
                                div::-webkit-scrollbar {
                                    display: none;
                                }
                            `}</style>
                            {featuredProducts.slice(6, 18).map((product: any, index: number) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex-shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.67rem)] md:w-auto"
                                >
                                    <ProductCard product={product} />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Newsletter Section */}
            <section className="py-20 bg-gradient-to-r from-primary-500 via-primary-600 to-orange-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                <div className="container mx-auto px-4 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-2xl mx-auto"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Stay Updated
                        </h2>
                        <p className="text-white/90 mb-8 text-lg">
                            Subscribe to our newsletter and get exclusive deals, new product alerts, and special offers delivered to your inbox.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
                            />
                            <Button 
                                size="large" 
                                className="bg-white text-primary-500 hover:bg-gray-100 border-0 font-semibold px-8 shadow-lg"
                            >
                                Subscribe
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            <HomeMerchandising />
        </MainLayout>
    )
}
