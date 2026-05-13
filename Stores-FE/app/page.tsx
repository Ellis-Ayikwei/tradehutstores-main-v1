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
import { AdSlot } from '@/components/Ads'
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
            {/* Below-hero banner placement — admin-managed (carousel of up to N) */}
            <section className="container mx-auto px-4 mt-4">
                <AdSlot slug="nav-banner" aspectClass="aspect-[21/5] md:aspect-[21/4]" rounded="rounded-2xl" />
            </section>
            <Categories />
            <HomeMerchandising />
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
        </MainLayout>
    )
}
