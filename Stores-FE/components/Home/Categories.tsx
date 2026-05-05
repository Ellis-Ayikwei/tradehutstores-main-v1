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

export default function CategoryCarousel() {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
            setCanScrollLeft(scrollLeft > 20)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20)
        }
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = scrollRef.current.clientWidth * 0.8
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    useEffect(() => {
        const currentRef = scrollRef.current
        checkScroll()
        window.addEventListener('resize', checkScroll)
        currentRef?.addEventListener('scroll', checkScroll)
        return () => {
            window.removeEventListener('resize', checkScroll)
            currentRef?.removeEventListener('scroll', checkScroll)
        }
    }, [])

    return (
        <section className="py-16 bg-white dark:bg-slate-950">
            <div className="container mx-auto px-6">
                
                {/* Header Section */}
                <div className="flex items-end justify-between mb-10">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                            Shop by Category
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl">
                            Explore our meticulously curated collections designed for every lifestyle.
                        </p>
                    </div>
                    
                    {/* Minimalist Controls */}
                    <div className="hidden sm:flex items-center gap-3">
                        <button
                            onClick={() => scroll('left')}
                            disabled={!canScrollLeft}
                            className={`p-3 rounded-full border transition-all duration-300 ${
                                canScrollLeft 
                                ? 'border-slate-200 text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:text-white dark:hover:bg-slate-900 shadow-sm' 
                                : 'border-slate-100 text-slate-300 cursor-not-allowed dark:border-slate-900 dark:text-slate-700'
                            }`}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            disabled={!canScrollRight}
                            className={`p-3 rounded-full border transition-all duration-300 ${
                                canScrollRight 
                                ? 'border-slate-200 text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:text-white dark:hover:bg-slate-900 shadow-sm' 
                                : 'border-slate-100 text-slate-300 cursor-not-allowed dark:border-slate-900 dark:text-slate-700'
                            }`}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Carousel Container */}
                <div className="relative group">
                    <div 
                        ref={scrollRef}
                        className="flex gap-6 overflow-x-auto pb-8 pt-4 no-scrollbar scroll-smooth snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {categories.map((cat, idx) => {
                            const Icon = cat.icon
                            return (
                                <Link 
                                    key={idx}
                                    href={`/category/${cat.name.toLowerCase()}`}
                                    className="flex-shrink-0 snap-start group/card"
                                >
                                    <div className="flex flex-col items-center gap-4 w-32 sm:w-40">
                                        {/* Gradient ring + theme-aware inner squircle */}
                                        <div
                                            className={`relative h-24 w-24 sm:h-32 sm:w-32 rounded-[2.5rem] p-[2px] bg-gradient-to-br ${cat.gradient} transition-all duration-500 group-hover/card:rounded-3xl group-hover/card:-translate-y-2 group-hover/card:shadow-xl group-hover/card:shadow-slate-300/40 dark:group-hover/card:shadow-black/50`}
                                        >
                                            <div className="flex h-full w-full items-center justify-center rounded-[calc(2.5rem-2px)] bg-slate-50 transition-colors duration-500 group-hover/card:rounded-[calc(1.5rem-2px)] group-hover/card:bg-white dark:rounded-[calc(2.5rem-2px)] dark:bg-slate-900 dark:group-hover/card:rounded-[calc(1.5rem-2px)] dark:group-hover/card:bg-slate-800/90">
                                                <div className="text-slate-700 transition-transform duration-500 group-hover/card:scale-110 dark:text-slate-200">
                                                    <Icon strokeWidth={1.5} size={40} className="text-inherit" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Labels */}
                                        <div className="text-center">
                                            <span className="block text-sm font-bold text-slate-900 transition-colors duration-300 dark:text-slate-100 group-hover/card:text-slate-950 dark:group-hover/card:text-white">
                                                {cat.name}
                                            </span>
                                            <span className="mt-1 block text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                {cat.count.toLocaleString()} Items
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>

                    {/* Edge Fades */}
                    <div className="absolute top-0 bottom-8 left-0 w-20 bg-gradient-to-r from-white dark:from-slate-950 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-0 bottom-8 right-0 w-20 bg-gradient-to-l from-white dark:from-slate-950 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            {/* Custom Scrollbar CSS for Webkit */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </section>
    )
}