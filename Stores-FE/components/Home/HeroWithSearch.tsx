'use client'

import { useState, useEffect, useRef } from 'react'
import { Package, Store, Wrench, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import SearchBar from '@/components/common/SearchBar'

export default function HeroWithSearch() {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [currentProductIndex, setCurrentProductIndex] = useState(0)
    const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 43, seconds: 5 })
    const router = useRouter()
    const carouselRef = useRef<HTMLDivElement>(null)

    const frequentlySearched = [
        'blender',
        'fridges for home',
        'iphones 15 pro max',
        'gaming laptop',
        'washing machine',
        'laptop',
        'mobile phones'
    ]

    const promoBanners = [
        {
            id: 1,
            title: 'Summer Sale',
            description: 'Up to 70% OFF on Electronics',
            bgColor: 'from-primary-500 to-orange-500',
            image: '🔥'
        },
        {
            id: 2,
            title: 'New Arrivals',
            description: 'Latest Smartphones & Gadgets',
            bgColor: 'from-blue-500 to-purple-500',
            image: '📱'
        },
        {
            id: 3,
            title: 'Home Appliances',
            description: 'Best Deals on Kitchen & Home',
            bgColor: 'from-green-500 to-teal-500',
            image: '🏠'
        },
        {
            id: 4,
            title: 'Gaming Zone',
            description: 'Premium Gaming Laptops & Accessories',
            bgColor: 'from-red-500 to-pink-500',
            image: '🎮'
        },
        {
            id: 5,
            title: 'Fashion Week',
            description: 'Trending Styles & Accessories',
            bgColor: 'from-purple-500 to-indigo-500',
            image: '👕'
        },
        {
            id: 6,
            title: 'Flash Deals',
            description: '24-Hour Special Offers',
            bgColor: 'from-yellow-500 to-orange-500',
            image: '⚡'
        }
    ]

    const flashSaleProducts = [
        {
            id: 1,
            name: 'Xiaomi Redmi 15C - 256GB - 8GB RAM - 50MP Camera',
            category: 'Electronics',
            brand: 'Xiaomi',
            price: 1607.00,
            rating: 0
        },
        {
            id: 2,
            name: "Men's Business Suit - 2 Piece - Formal",
            category: 'Fashion',
            brand: 'Executive',
            price: 450.00,
            rating: 0
        },
        {
            id: 3,
            name: 'Yoga Mat - Non-Slip - Extra Thick 10mm',
            category: 'Sports',
            brand: 'FitLife',
            price: 45.00,
            rating: 0
        },
        {
            id: 4,
            name: 'Unisex Sneakers - Comfortable Running Shoes',
            category: 'Fashion',
            brand: 'SportFit',
            price: 200.00,
            rating: 0
        },
        {
            id: 5,
            name: 'Resistance Bands Set - 5 Levels',
            category: 'Sports',
            brand: 'FitBand',
            price: 35.00,
            rating: 0
        }
    ]

    const services = [
        {
            title: 'Track Your Order',
            description: 'Real-time order tracking',
            icon: Package,
            link: '/track-order'
        },
        {
            title: 'Sell on TradeHut',
            description: 'Start your business today',
            icon: Store,
            link: '/sell'
        },
        {
            title: 'Get Repair Service',
            description: 'Expert repair solutions',
            icon: Wrench,
            link: '/repair-service'
        }
    ]

    // Auto-slide carousel
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % promoBanners.length)
        }, 4000)
        return () => clearInterval(interval)
    }, [promoBanners.length])

    // Countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                let { hours, minutes, seconds } = prev
                
                if (seconds > 0) {
                    seconds--
                } else if (minutes > 0) {
                    minutes--
                    seconds = 59
                } else if (hours > 0) {
                    hours--
                    minutes = 59
                    seconds = 59
                } else {
                    // Reset to 8 hours when countdown reaches 0
                    return { hours: 8, minutes: 0, seconds: 0 }
                }
                
                return { hours, minutes, seconds }
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    // Auto-rotate flash sale products
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentProductIndex((prev) => (prev + 1) % flashSaleProducts.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [flashSaleProducts.length])

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % promoBanners.length)
    }

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + promoBanners.length) % promoBanners.length)
    }

    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-[60vh] md:min-h-[70vh] lg:min-h-[80vh]">
            {/* Background Image/Pattern */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[url('/assets/images/hero-bg.jpg')] bg-cover bg-center opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-gray-900/90" />
            </div>

            {/* Content */}
            <div className="relative container mx-auto px-4 py-8 md:py-12 lg:py-2 h-full flex items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-7xl mx-auto"
                >
                   
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
    
                    <div className="lg:col-span-2">
                        {/* Search Box */}
                        <div className="bg-white rounded-md shadow-2xl p-4 md:p-6 mb-6">
                            <SearchBar variant="hero" />
                            {/* Frequently Searched */}
                            <div className="flex items-center gap-2 md:gap-3 flex-wrap text-xs md:text-sm">
                                <span className="text-gray-600 font-medium">Frequently searched:</span>
                                {frequentlySearched.map((term, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            router.push(`/products?search=${encodeURIComponent(term)}`)
                                        }}
                                        className="text-primary-500 hover:text-primary-600 hover:underline transition-colors"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                            {/* Three Items Section: Carousel + Action Boxes */}
                            <div className="">
                                {/* Left: Promotional Carousel (Takes 2 columns on large screens) */}
                                <div className="lg:col-span-2">
                                    <div className="relative h-64 md:h-96 lg:h-[28rem] xl:h-[32rem] bg-white rounded-md shadow-xl overflow-hidden group">
                                        <div
                                            ref={carouselRef}
                                            className="flex transition-transform duration-500 ease-in-out h-full"
                                            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                                        >
                                            {promoBanners.map((banner) => (
                                                <div
                                                    key={banner.id}
                                                    className={`min-w-full h-full bg-gradient-to-br ${banner.bgColor} flex flex-col items-center justify-center text-white p-8`}
                                                >
                                                    <div className="text-6xl md:text-8xl mb-4">{banner.image}</div>
                                                    <h3 className="text-2xl md:text-4xl font-bold mb-2">{banner.title}</h3>
                                                    <p className="text-base md:text-xl opacity-90">{banner.description}</p>
                                                    <button className="mt-6 px-6 py-2 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                                                        Shop Now
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Navigation Arrows */}
                                        <button
                                            onClick={prevSlide}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <ChevronLeft className="h-6 w-6 text-white" />
                                        </button>
                                        <button
                                            onClick={nextSlide}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <ChevronRight className="h-6 w-6 text-white" />
                                        </button>
                                        {/* Dots Indicator */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                            {promoBanners.map((_, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentSlide(index)}
                                                    className={`w-2 h-2 rounded-full transition-all ${
                                                        currentSlide === index
                                                            ? 'bg-white w-8'
                                                            : 'bg-white/50 hover:bg-white/75'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                    </div>
                            {/* Right: Action Boxes (Takes 1 column) */}
                            <div className="flex flex-col gap-4">
                                {/* Box 1: Services Combined */}
                                <div className="bg-white dark:bg-gray-800 rounded-md shadow-xl p-4 md:p-6 space-y-3">
                                    {services.map((service, index) => {
                                        const Icon = service.icon
                                        return (
                                            <Link
                                                key={index}
                                                href={service.link}
                                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all group border border-gray-100 dark:border-gray-700"
                                            >
                                                <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors">
                                                    <Icon className="h-5 w-5 text-primary-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">
                                                        {service.title}
                                                    </h3>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        {service.description}
                                                    </p>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
    
                                {/* Box 2: Flash Sales with Rotating Products */}
                                <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-md shadow-xl p-4 md:p-6 text-white h-64 md:h-80 lg:h-96 flex flex-col">

                                    
                                    {/* Rotating Product Display */}
                                    <div className="flex-1 relative overflow-hidden">
                                        <div
                                            className="flex transition-transform duration-500 ease-in-out h-full"
                                            style={{ transform: `translateX(-${currentProductIndex * 100}%)` }}
                                        >
                                            {flashSaleProducts.map((product) => (
                                                <div
                                                    key={product.id}
                                                    className="min-w-full h-full flex items-center justify-center p-4"
                                                >
                                                    {/* Product Image Placeholder */}
                                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg w-full h-full flex items-center justify-center">
                                                        <span className="text-white/50 text-sm">No image</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
    
                                    {/* Product Dots Indicator */}
                                    <div className="flex gap-1.5 justify-center mt-4">
                                        {flashSaleProducts.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentProductIndex(index)}
                                                className={`h-1.5 rounded-full transition-all ${
                                                    currentProductIndex === index
                                                        ? 'bg-white w-6'
                                                        : 'bg-white/40 hover:bg-white/60 w-1.5'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
</div>
                </motion.div>
            </div>

            {/* Wave Separator - Hidden as flash sales overlaps */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                <svg
                    className="w-full h-16 md:h-20 lg:h-24 text-gray-50 dark:text-gray-900"
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0,50 C150,80 350,0 600,50 C850,100 1050,20 1200,50 L1200,120 L0,120 Z"
                        fill="currentColor"
                    />
                </svg>
            </div>
        </section>
    )
}

