'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { 
    Smartphone, 
    Shirt, 
    Home, 
    Dumbbell, 
    Sparkles, 
    Gamepad2, 
    BookOpen, 
    Car,
    PawPrint,
    Briefcase,
    Baby,
    Watch,
    Music,
    Wrench,
    Palette,
    UtensilsCrossed,
    Laptop,
    Camera,
    Headphones,
    Tv,
    ShoppingBag,
    Heart,
    Gift,
    Cpu,
    Zap,
    Droplet,
    Flower2,
    Sofa,
    Bed,
    Lamp,
    Refrigerator,
    Microwave,
    Fan,
    AirVent,
    ShowerHead,
    DoorOpen,
    Key,
    Hammer,
    Drill,
    Paintbrush,
    Scissors,
    Ruler,
    Package,
    Box,
    Truck,
    Bike,
    Plane,
    Ship,
    Train,
    Bus,
    Fuel,
    Settings,
    Cog,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'

const categories = [
    { 
        name: 'Electronics & Accessories', 
        icon: Smartphone,
        count: 4785,
        gradient: 'from-blue-500 to-cyan-500'
    },
    { 
        name: 'Fashion & Apparel', 
        icon: Shirt,
        count: 9030,
        gradient: 'from-pink-500 to-rose-500'
    },
    { 
        name: 'Home & Garden', 
        icon: Home,
        count: 6730,
        gradient: 'from-green-500 to-emerald-500'
    },
    { 
        name: 'Sports & Outdoors', 
        icon: Dumbbell,
        count: 3900,
        gradient: 'from-orange-500 to-amber-500'
    },
    { 
        name: 'Health & Beauty', 
        icon: Sparkles,
        count: 6230,
        gradient: 'from-purple-500 to-fuchsia-500'
    },
    { 
        name: 'Toys & Games', 
        icon: Gamepad2,
        count: 2740,
        gradient: 'from-red-500 to-pink-500'
    },
    { 
        name: 'Books & Media', 
        icon: BookOpen,
        count: 7540,
        gradient: 'from-indigo-500 to-blue-500'
    },
    { 
        name: 'Automotive', 
        icon: Car,
        count: 5360,
        gradient: 'from-slate-600 to-gray-700'
    },
    { 
        name: 'Pet Supplies', 
        icon: PawPrint,
        count: 3280,
        gradient: 'from-amber-500 to-yellow-500'
    },
    { 
        name: 'Office Supplies', 
        icon: Briefcase,
        count: 4150,
        gradient: 'from-teal-500 to-cyan-500'
    },
    { 
        name: 'Baby & Kids', 
        icon: Baby,
        count: 5890,
        gradient: 'from-sky-400 to-blue-400'
    },
    { 
        name: 'Jewelry & Watches', 
        icon: Watch,
        count: 2940,
        gradient: 'from-yellow-500 to-orange-400'
    },
    { 
        name: 'Musical Instruments', 
        icon: Music,
        count: 1820,
        gradient: 'from-violet-500 to-purple-500'
    },
    { 
        name: 'Industrial & Tools', 
        icon: Wrench,
        count: 6720,
        gradient: 'from-zinc-600 to-stone-700'
    },
    { 
        name: 'Arts & Crafts', 
        icon: Palette,
        count: 3560,
        gradient: 'from-fuchsia-500 to-pink-500'
    },
    { 
        name: 'Food & Beverages', 
        icon: UtensilsCrossed,
        count: 4980,
        gradient: 'from-lime-500 to-green-500'
    },
    { 
        name: 'Computers & Laptops', 
        icon: Laptop,
        count: 3420,
        gradient: 'from-blue-600 to-indigo-600'
    },
    { 
        name: 'Cameras & Photography', 
        icon: Camera,
        count: 1890,
        gradient: 'from-gray-600 to-slate-700'
    },
    { 
        name: 'Audio & Headphones', 
        icon: Headphones,
        count: 2560,
        gradient: 'from-purple-600 to-violet-600'
    },
    { 
        name: 'TV & Entertainment', 
        icon: Tv,
        count: 4120,
        gradient: 'from-red-600 to-rose-600'
    },
    { 
        name: 'Gaming Consoles', 
        icon: Gamepad2,
        count: 1780,
        gradient: 'from-green-600 to-emerald-600'
    },
    { 
        name: 'Bags & Luggage', 
        icon: ShoppingBag,
        count: 5230,
        gradient: 'from-amber-600 to-yellow-600'
    },
    { 
        name: 'Fitness & Wellness', 
        icon: Heart,
        count: 3890,
        gradient: 'from-pink-600 to-rose-600'
    },
    { 
        name: 'Gifts & Party Supplies', 
        icon: Gift,
        count: 2340,
        gradient: 'from-cyan-500 to-blue-500'
    },
    { 
        name: 'Computer Components', 
        icon: Cpu,
        count: 5670,
        gradient: 'from-indigo-600 to-purple-600'
    },
    { 
        name: 'Mobile Accessories', 
        icon: Zap,
        count: 6780,
        gradient: 'from-yellow-500 to-orange-500'
    },
    { 
        name: 'Beauty & Skincare', 
        icon: Droplet,
        count: 4450,
        gradient: 'from-rose-500 to-pink-500'
    },
    { 
        name: 'Garden & Plants', 
        icon: Flower2,
        count: 3120,
        gradient: 'from-green-500 to-emerald-500'
    },
    { 
        name: 'Furniture', 
        icon: Sofa,
        count: 4890,
        gradient: 'from-amber-500 to-yellow-500'
    },
    { 
        name: 'Bedding & Bath', 
        icon: Bed,
        count: 3560,
        gradient: 'from-blue-400 to-cyan-400'
    },
    { 
        name: 'Lighting', 
        icon: Lamp,
        count: 2780,
        gradient: 'from-yellow-400 to-orange-400'
    },
    { 
        name: 'Kitchen Appliances', 
        icon: Refrigerator,
        count: 5230,
        gradient: 'from-gray-500 to-slate-500'
    },
    { 
        name: 'Small Appliances', 
        icon: Microwave,
        count: 4120,
        gradient: 'from-red-500 to-pink-500'
    },
    { 
        name: 'Cooling & Heating', 
        icon: Fan,
        count: 2890,
        gradient: 'from-cyan-400 to-blue-400'
    },
    { 
        name: 'Ventilation', 
        icon: AirVent,
        count: 1560,
        gradient: 'from-gray-400 to-slate-400'
    },
    { 
        name: 'Bathroom Fixtures', 
        icon: ShowerHead,
        count: 2340,
        gradient: 'from-blue-500 to-cyan-500'
    },
    { 
        name: 'Doors & Windows', 
        icon: DoorOpen,
        count: 1890,
        gradient: 'from-amber-600 to-yellow-600'
    },
    { 
        name: 'Security & Locks', 
        icon: Key,
        count: 3120,
        gradient: 'from-slate-600 to-gray-600'
    },
    { 
        name: 'Power Tools', 
        icon: Hammer,
        count: 4450,
        gradient: 'from-orange-600 to-red-600'
    },
    { 
        name: 'Drills & Saws', 
        icon: Drill,
        count: 2780,
        gradient: 'from-gray-700 to-slate-700'
    },
    { 
        name: 'Paint & Supplies', 
        icon: Paintbrush,
        count: 3560,
        gradient: 'from-purple-500 to-pink-500'
    },
    { 
        name: 'Craft Supplies', 
        icon: Scissors,
        count: 4120,
        gradient: 'from-fuchsia-500 to-purple-500'
    },
    { 
        name: 'Measuring Tools', 
        icon: Ruler,
        count: 2340,
        gradient: 'from-teal-500 to-cyan-500'
    },
    { 
        name: 'Storage & Organization', 
        icon: Box,
        count: 5670,
        gradient: 'from-indigo-500 to-blue-500'
    },
    { 
        name: 'Shipping Supplies', 
        icon: Package,
        count: 1890,
        gradient: 'from-amber-500 to-orange-500'
    },
    { 
        name: 'Delivery & Logistics', 
        icon: Truck,
        count: 890,
        gradient: 'from-gray-600 to-slate-600'
    },
    { 
        name: 'Bicycles & Accessories', 
        icon: Bike,
        count: 2340,
        gradient: 'from-green-600 to-emerald-600'
    },
    { 
        name: 'Travel & Tourism', 
        icon: Plane,
        count: 1560,
        gradient: 'from-sky-500 to-blue-500'
    },
    { 
        name: 'Marine & Boating', 
        icon: Ship,
        count: 890,
        gradient: 'from-blue-600 to-cyan-600'
    },
    { 
        name: 'Rail & Train', 
        icon: Train,
        count: 450,
        gradient: 'from-slate-600 to-gray-600'
    },
    { 
        name: 'Public Transport', 
        icon: Bus,
        count: 320,
        gradient: 'from-red-600 to-orange-600'
    },
    { 
        name: 'Fuel & Energy', 
        icon: Fuel,
        count: 1230,
        gradient: 'from-yellow-600 to-orange-600'
    },
    { 
        name: 'Machinery & Equipment', 
        icon: Settings,
        count: 4560,
        gradient: 'from-gray-700 to-slate-700'
    },
    { 
        name: 'Industrial Parts', 
        icon: Cog,
        count: 6780,
        gradient: 'from-zinc-700 to-stone-700'
    },
]

export default function Categories() {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)
    const [isScrolling, setIsScrolling] = useState(false)

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
            const hasScroll = scrollWidth > clientWidth
            setCanScrollLeft(hasScroll && scrollLeft > 10)
            setCanScrollRight(hasScroll && scrollLeft < scrollWidth - clientWidth - 10)
        }
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current && !isScrolling) {
            setIsScrolling(true)
            const scrollAmount = scrollRef.current.clientWidth * 0.75
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'auto'
            })
            setTimeout(() => {
                checkScroll()
                setIsScrolling(false)
            }, 400)
        }
    }

    // Check scroll on mount and resize
    useEffect(() => {
        checkScroll()
        const handleResize = () => {
            setTimeout(checkScroll, 100)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && canScrollLeft) {
                e.preventDefault()
                scroll('left')
            } else if (e.key === 'ArrowRight' && canScrollRight) {
                e.preventDefault()
                scroll('right')
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [canScrollLeft, canScrollRight])

    // Split categories into two rows
    const firstRow = categories.slice(0, Math.ceil(categories.length / 2))
    const secondRow = categories.slice(Math.ceil(categories.length / 2))

    const CategoryCard = ({ category, index }: { category: typeof categories[0], index: number }) => {
        const Icon = category.icon
        return (
            <div className="group relative flex-shrink-0">
                <Link href={`/products?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-gray-200 dark:border-gray-700 group-hover:border-primary-500 overflow-hidden shadow-md group-hover:shadow-xl">
                        <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient}`} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                            <Icon className="h-7 w-7 sm:h-9 sm:w-9 text-white mb-1" />
                            <h3 className="text-white font-semibold text-[9px] sm:text-[10px] text-center leading-tight mb-0.5 line-clamp-2 drop-shadow-sm">
                                {category.name}
                            </h3>
                            <p className="text-white/80 text-[8px] sm:text-[9px] text-center drop-shadow-sm">
                                {category.count.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </Link>
            </div>
        )
    }

    return (
        <section className="py-12 sm:py-16 bg-gray-50 dark:bg-gray-900/50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-8 sm:mb-12">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                        Shop by Category
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg">
                        Explore our wide range of product categories
                    </p>
                </div>
                
                {/* Scrollable Container */}
                <div className="relative group/container">
                    {/* Gradient Fade - Left */}
                    {canScrollLeft && (
                        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-20 bg-gradient-to-r from-gray-50 dark:from-gray-900/50 to-transparent z-10 pointer-events-none" />
                    )}

                    {/* Gradient Fade - Right */}
                    {canScrollRight && (
                        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-20 bg-gradient-to-l from-gray-50 dark:from-gray-900/50 to-transparent z-10 pointer-events-none" />
                    )}

                    {/* Left Arrow */}
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft || isScrolling}
                        className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center ${
                            canScrollLeft 
                                ? 'opacity-100 hover:bg-primary-50 dark:hover:bg-gray-700 hover:border-primary-300 dark:hover:border-primary-600' 
                                : 'opacity-0 pointer-events-none'
                        }`}
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className={`h-5 w-5 sm:h-6 sm:w-6 ${
                            canScrollLeft ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'
                        }`} />
                    </button>

                    {/* Right Arrow */}
                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight || isScrolling}
                        className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center ${
                            canScrollRight 
                                ? 'opacity-100 hover:bg-primary-50 dark:hover:bg-gray-700 hover:border-primary-300 dark:hover:border-primary-600' 
                                : 'opacity-0 pointer-events-none'
                        }`}
                        aria-label="Scroll right"
                    >
                        <ChevronRight className={`h-5 w-5 sm:h-6 sm:w-6 ${
                            canScrollRight ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'
                        }`} />
                    </button>

                    {/* Scrollable Content */}
                    <div 
                        ref={scrollRef}
                        onScroll={checkScroll}
                        className="overflow-x-auto"
                        style={{ 
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
                        <style jsx>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        <div className="flex flex-col gap-4 px-12 sm:px-16 pb-2">
                            {/* First Row */}
                            <div className="flex gap-4 sm:gap-5">
                                {firstRow.map((category, index) => (
                                    <CategoryCard key={index} category={category} index={index} />
                                ))}
                            </div>

                            {/* Second Row */}
                            <div className="flex gap-4 sm:gap-5">
                                {secondRow.map((category, index) => (
                                    <CategoryCard key={index + firstRow.length} category={category} index={index + firstRow.length} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}