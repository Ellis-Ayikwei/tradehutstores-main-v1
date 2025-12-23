import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ScrollToTop = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);

    // Show button when page is scrolled up to given distance
    const toggleVisibility = () => {
        if (window.pageYOffset > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    // Set the scroll event listener
    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => {
            window.removeEventListener('scroll', toggleVisibility);
        };
    }, []);

    // Enhanced scroll to top handler with animation
    const scrollToTop = () => {
        setIsScrolling(true);
        const duration = 1000; // Duration in milliseconds
        const start = window.pageYOffset;
        const startTime = performance.now();

        const animateScroll = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth deceleration
            const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

            window.scrollTo({
                top: start * (1 - easeOutCubic(progress)),
            });

            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            } else {
                setIsScrolling(false);
            }
        };

        requestAnimationFrame(animateScroll);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    onClick={scrollToTop}
                    disabled={isScrolling}
                    className="fixed bottom-8 right-8 z-50 p-4 bg-[#dc711a] hover:bg-[#b95d13] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-75"
                    aria-label="Scroll to top"
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <motion.i
                        className={`fas fa-arrow-up text-xl transition-transform ${isScrolling ? 'animate-bounce' : 'group-hover:-translate-y-1'}`}
                        animate={
                            isScrolling
                                ? {
                                      y: [-2, -8, -2],
                                      transition: {
                                          duration: 0.6,
                                          repeat: Infinity,
                                          ease: 'easeInOut',
                                      },
                                  }
                                : {}
                        }
                    />
                </motion.button>
            )}
        </AnimatePresence>
    );
};

export default ScrollToTop;
