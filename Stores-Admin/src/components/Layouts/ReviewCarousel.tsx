import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSwr from 'swr';
import axios from 'axios';

interface Review {
    id: number;
    name: string;
    role: string;
    company: string;
    image: string;
    rating: number;
    review: string;
    service: 'repair' | 'web' | 'support' | 'sales';
}

const reviews: Review[] = [
    {
        id: 1,
        name: 'Sarah Johnson',
        role: 'CEO',
        company: 'TechStart Ghana',
        image: '/src/assets/images/testimonials/sarah.jpg',
        rating: 5,
        review: "TradeHut's web development service exceeded our expectations. They delivered a stunning website that perfectly captures our brand essence.",
        service: 'web',
    },
    {
        id: 2,
        name: 'Kwame Mensah',
        role: 'Business Owner',
        company: 'Digital Solutions',
        image: '/src/assets/images/testimonials/kwame.jpg',
        rating: 5,
        review: "The phone repair service was quick and professional. They fixed my iPhone's screen in just 2 hours!",
        service: 'repair',
    },
    {
        id: 3,
        name: 'Abena Osei',
        role: 'IT Manager',
        company: 'Ghana Tech Corp',
        image: '/src/assets/images/testimonials/abena.jpg',
        rating: 5,
        review: "Their IT support team is exceptional. They've helped us maintain our systems efficiently and resolve issues quickly.",
        service: 'support',
    },
    // Add more reviews as needed
];

interface DragEvent {
    offset: {
        x: number;
        y: number;
    };
    velocity: {
        x: number;
        y: number;
    };
}

const fetcher = async (url: string) => {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Error fetching data: ${error.response?.statusText}`);
        }
        throw error;
    }
};

const ReviewCarousel: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [error, setError] = useState<string | null>(null);

    // const { data, error: somerrr } = useSwr(url, fetcher);

    // useEffect(() => {
    //     if (error) {
    //         console.error('Error fetching reviews:', error);
    //     } else if (data) {
    //         console.log('Reviews:', data);
    //     }
    // }, [data, error]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAutoPlaying) {
            interval = setInterval(() => {
                setDirection(1);
                setCurrentIndex((prev) => (prev + 1) % reviews.length);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isAutoPlaying]);

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
        }),
    };

    const swipeConfidenceThreshold = 10000;
    const swipePower = (offset: number, velocity: number) => {
        return Math.abs(offset) * velocity;
    };

    const paginate = (newDirection: number) => {
        setDirection(newDirection);
        setCurrentIndex((prev) => (prev + newDirection + reviews.length) % reviews.length);
    };

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: DragEvent) => {
        const swipe = swipePower(offset.x, velocity.x);
        if (swipe < -swipeConfidenceThreshold) {
            paginate(1);
        } else if (swipe > swipeConfidenceThreshold) {
            paginate(-1);
        }
    };

    return (
        <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
            {/* Enhanced Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[url('/src/assets/images/pattern-light.svg')] opacity-[0.03]" />
                <div className="absolute -top-40 right-0 w-[800px] h-[800px] bg-gradient-to-br from-orange-100/20 to-transparent rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 left-0 w-[800px] h-[800px] bg-gradient-to-tl from-orange-100/20 to-transparent rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto px-4 max-w-6xl relative">
                {/* Enhanced Section Header */}
                <div className="text-center mb-20">
                    <div className="inline-flex items-center justify-center space-x-2 mb-6">
                        <span className="w-12 h-1 bg-[#dc711a]/30 rounded-full" />
                        <span className="text-[#dc711a] font-semibold">Testimonials</span>
                        <span className="w-12 h-1 bg-[#dc711a]/30 rounded-full" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                        What Our Clients{' '}
                        <span className="relative">
                            <span className="relative z-10 text-[#dc711a]">Say</span>
                            <span className="absolute bottom-2 left-0 w-full h-3 bg-orange-100 -z-0" />
                        </span>
                    </h2>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">Discover why businesses and individuals trust TradeHut for their technology needs</p>
                </div>

                {/* Enhanced Carousel */}
                <div className="relative h-[500px] md:h-[400px]">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: 'spring', stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 },
                            }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={1}
                            onDragEnd={handleDragEnd}
                            className="absolute w-full"
                        >
                            <div className="bg-white rounded-3xl shadow-xl p-10 md:p-12 max-w-4xl mx-auto transform hover:scale-[1.02] transition-all duration-300">
                                <div className="flex flex-col md:flex-row items-center gap-10">
                                    <div className="flex-shrink-0">
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#dc711a] to-[#E19D66FF] rounded-full blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
                                            {/* <img
                                                src={reviews[currentIndex].image}
                                                alt={reviews[currentIndex].name}
                                                className="relative w-24 h-24 md:w-32 md:h-32 rounded-full object-cover ring-4 ring-white"
                                            /> */}
                                            <div className="absolute -bottom-3 -right-3 bg-[#dc711a] text-white rounded-full p-3 shadow-lg">
                                                {/* <i
                                                    className={`fas fa-${
                                                        reviews[currentIndex].service === 'repair'
                                                            ? 'tools'
                                                            : reviews[currentIndex].service === 'web'
                                                            ? 'code'
                                                            : reviews[currentIndex].service === 'support'
                                                            ? 'headset'
                                                            : 'store'
                                                    } text-lg`}
                                                ></i> */}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-grow text-center md:text-left">
                                        {/* <div className="flex items-center justify-center md:justify-start mb-4">
                                            {[...Array(reviews[currentIndex].rating)].map((_, i) => (
                                                <i key={i} className="fas fa-star text-yellow-400 text-lg"></i>
                                            ))}
                                        </div> */}
                                        {/* <p className="text-gray-700 text-xl mb-6 italic leading-relaxed">"{reviews[currentIndex].review}"</p>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900 mb-1">{reviews[currentIndex].name}</h4>
                                            <p className="text-[#dc711a]">
                                                {reviews[currentIndex].role} at {reviews[currentIndex].company}
                                            </p>
                                        </div> */}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Enhanced Navigation Buttons */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 flex justify-between pointer-events-none">
                        <button
                            onClick={() => paginate(-1)}
                            className="pointer-events-auto w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-600 hover:text-[#dc711a] hover:scale-110 transition-all duration-300 group"
                        >
                            <i className="fas fa-chevron-left text-lg group-hover:-translate-x-1 transition-transform"></i>
                        </button>
                        <button
                            onClick={() => paginate(1)}
                            className="pointer-events-auto w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-600 hover:text-[#dc711a] hover:scale-110 transition-all duration-300 group"
                        >
                            <i className="fas fa-chevron-right text-lg group-hover:translate-x-1 transition-transform"></i>
                        </button>
                    </div>

                    {/* Enhanced Dots Navigation */}
                    <div className="absolute -bottom-10 left-0 right-0 flex justify-center gap-3">
                        {reviews.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setDirection(index > currentIndex ? 1 : -1);
                                    setCurrentIndex(index);
                                }}
                                className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-8 bg-[#dc711a]' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ReviewCarousel;
