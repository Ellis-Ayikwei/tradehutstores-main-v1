import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faStarHalf, faMapMarkerAlt, faChevronRight } from '@fortawesome/free-solid-svg-icons';

interface Provider {
    id: number;
    name: string;
    image: string;
    rating: number;
    reviewCount: number;
    description: string;
    services: string[];
    location: string;
    backgroundImage: string;
}

interface FeaturedProvidersProps {
    providers: Provider[];
}

const FeaturedProviders: React.FC<FeaturedProvidersProps> = ({ providers }) => {
    return (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                        className="text-3xl font-bold text-gray-900 dark:text-white mb-4"
                    >
                        Top-Rated Moving Partners
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        viewport={{ once: true }}
                        className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
                    >
                        Our network of verified and insured van operators ensures quality service for every move.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {providers.map((provider, index) => (
                        <motion.div
                            key={provider.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="group bg-white dark:bg-gray-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                        >
                            <div
                                className="h-56 relative bg-gradient-to-b from-transparent to-black/60"
                                style={{
                                    backgroundImage: `url(${provider.backgroundImage})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                                <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg">
                                    <div className="flex items-center">
                                        <FontAwesomeIcon icon={faStar} className="text-yellow-500 mr-1" />
                                        <span className="font-semibold text-gray-900 dark:text-white">{provider.rating}</span>
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    <div className="flex items-center">
                                        <div className="relative">
                                            <img
                                                src={provider.image}
                                                alt={provider.name}
                                                className="w-16 h-16 rounded-full border-2 border-white object-cover transform group-hover:scale-110 transition-transform duration-300"
                                            />
                                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="font-semibold text-xl group-hover:text-secondary transition-colors">{provider.name}</h3>
                                            <div className="flex items-center text-sm text-gray-200">
                                                <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />
                                                {provider.location}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <div className="flex text-yellow-500 mr-2">
                                            {[...Array(5)].map((_, i) => (
                                                <FontAwesomeIcon
                                                    key={i}
                                                    icon={i < Math.floor(provider.rating) ? faStar : i < provider.rating ? faStarHalf : faStar}
                                                    className={i < Math.floor(provider.rating) ? 'text-yellow-500' : i < provider.rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-gray-600 dark:text-gray-300 text-sm">{provider.reviewCount} reviews</span>
                                    </div>
                                    <span className="text-sm font-medium text-secondary">Verified Provider</span>
                                </div>

                                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{provider.description}</p>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {provider.services.map((service, index) => (
                                        <span
                                            key={index}
                                            className="bg-secondary/10 text-secondary dark:text-secondary/90 text-xs px-3 py-1.5 rounded-full hover:bg-secondary/20 transition-colors cursor-default"
                                        >
                                            {service}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <Link
                                        to={`/providers/${provider.id}`}
                                        className="flex-1 inline-flex items-center justify-center bg-secondary hover:bg-secondary/90 text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 hover:shadow-lg group-hover:scale-[1.02]"
                                    >
                                        View Profile
                                    </Link>
                                    <button className="p-3 rounded-xl bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors" aria-label="Save provider">
                                        <FontAwesomeIcon icon={faStar} className="text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} viewport={{ once: true }} className="mt-12 text-center">
                    <Link
                        to="/providers"
                        className="inline-flex items-center font-medium text-secondary hover:text-secondary/80 dark:text-secondary/90 dark:hover:text-secondary transition-colors group"
                    >
                        View all providers
                        <FontAwesomeIcon icon={faChevronRight} className="ml-2 text-sm transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};

export default FeaturedProviders;
