import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBookmark, 
  faStar, 
  faStarHalfAlt,
  faTimes, 
  faCheckCircle, 
  faTruck, 
  faBox, 
  faCoins, 
  faMapMarkedAlt, 
  faCalendarAlt, 
  faShieldAlt,
  faPhone,
  faEnvelope,
  faCommentAlt,
  faThumbsUp,
  faHistory,
  faCamera,
  faIdCard,
  faHandshake,
  faUserCheck
} from '@fortawesome/free-solid-svg-icons';
import { AnimatePresence, motion } from 'framer-motion';

interface ProviderReview {
    text: string;
    rating: number;
    author: string;
    date: string;
}

interface Provider {
    id: string | number;
    name: string;
    rating: number;
    verified: boolean;
    vehicleType: string;
    capacity: string;
    serviceRadius: string;
    price: string | number;
    additionalInfo?: string;
    phone?: string;
    email?: string;
    description?: string;
    joinedDate?: string;
    serviceTypes?: string[];
    reviews: ProviderReview[];
    profileImage: string;
    vehicleImages?: string[];
    documents?: {verified: boolean}[];
    availability?: string;
    completionRate?: number;
    responseTime?: string;
}

interface ProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: Provider;
    onBook?: (providerId: string | number) => void;
    onSave?: (providerId: string | number) => void;
    onContact?: (providerId: string | number) => void;
}

const ProviderModal: React.FC<ProviderModalProps> = ({ 
    isOpen, 
    onClose, 
    provider, 
    onBook,
    onSave,
    onContact 
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'reviews' | 'photos'>('profile');
    const [showFullReviews, setShowFullReviews] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);
    
    // Handle click outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    
    const handleSave = () => {
        setIsSaved(!isSaved);
        if (onSave) onSave(provider.id);
    };
    
    const handleBook = () => {
        if (onBook) {
            onBook(provider.id);
        } else {
            window.location.href = `/book/${provider.id}`;
        }
    };
    
    const handleContact = () => {
        if (onContact) {
            onContact(provider.id);
        }
    };
    
    if (!isOpen) return null;
    
    // Calculate the rating distribution for the rating breakdown
    const ratingCounts = {
        5: Math.floor(Math.random() * provider.reviews.length),
        4: Math.floor(Math.random() * provider.reviews.length),
        3: Math.floor(Math.random() * (provider.reviews.length / 3)),
        2: Math.floor(Math.random() * (provider.reviews.length / 5)),
        1: Math.floor(Math.random() * (provider.reviews.length / 10))
    };
    
    // Make sure the total adds up to the number of reviews
    const totalRatings = Object.values(ratingCounts).reduce((sum, count) => sum + count, 0);
    if (totalRatings !== provider.reviews.length) {
        const diff = provider.reviews.length - totalRatings;
        ratingCounts[5] += diff;
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto"
                    onClick={handleBackdropClick}
                    data-testid="provider-modal"
                >
                    <motion.div 
                        ref={modalRef}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-3xl relative shadow-xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button 
                            onClick={onClose} 
                            className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 bg-white dark:bg-gray-700 rounded-full p-2 z-10 transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                            aria-label="Close modal"
                        >
                            <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
                        </button>

                        {/* Provider Header with Gradient Background */}
                        <div className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-900 opacity-10"></div>
                            <div className="p-6 sm:p-8 relative z-[1]">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                                    <div className="relative">
                                        <img 
                                            src={provider.profileImage || 'https://via.placeholder.com/150'} 
                                            alt={provider.name} 
                                            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-md" 
                                        />
                                        {provider.verified && (
                                            <div className="absolute bottom-0 right-0 bg-green-500 rounded-full h-8 w-8 flex items-center justify-center border-2 border-white dark:border-gray-700">
                                                <FontAwesomeIcon icon={faCheckCircle} className="text-white text-sm" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 text-center sm:text-left">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{provider.name}</h2>
                                            {provider.verified && (
                                                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center">
                                                    <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                                    Verified Provider
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="mt-2 mb-1 flex items-center justify-center sm:justify-start">
                                            <div className="flex items-center">
                                                {Array.from({ length: 5 }).map((_, i) => {
                                                    if (i < Math.floor(provider.rating)) {
                                                        return <FontAwesomeIcon key={`star-${i}`} icon={faStar} className="text-yellow-400" />;
                                                    } else if (i === Math.floor(provider.rating) && provider.rating % 1 >= 0.5) {
                                                        return <FontAwesomeIcon key={`star-half-${i}`} icon={faStarHalfAlt} className="text-yellow-400" />;
                                                    } else {
                                                        return <FontAwesomeIcon key={`star-empty-${i}`} icon={faStar} className="text-gray-300 dark:text-gray-600" />;
                                                    }
                                                })}
                                                <span className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{provider.rating.toFixed(1)}</span>
                                                <span className="mx-1 text-gray-500 dark:text-gray-400">•</span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">{provider.reviews.length} reviews</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                                <FontAwesomeIcon icon={faTruck} className="mr-1.5 text-blue-500 dark:text-blue-400" />
                                                {provider.vehicleType}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                                <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-1.5 text-blue-500 dark:text-blue-400" />
                                                {provider.serviceRadius} radius
                                            </div>
                                            {provider.completionRate && (
                                                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                                    <FontAwesomeIcon icon={faThumbsUp} className="mr-1.5 text-blue-500 dark:text-blue-400" />
                                                    {provider.completionRate}% completion rate
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Tabs Navigation */}
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <div className="px-6 flex">
                                <button 
                                    className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'profile' 
                                            ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                    onClick={() => setActiveTab('profile')}
                                >
                                    Profile & Services
                                </button>
                                <button 
                                    className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'reviews' 
                                            ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                    onClick={() => setActiveTab('reviews')}
                                >
                                    Reviews ({provider.reviews.length})
                                </button>
                                
                                {provider.vehicleImages && provider.vehicleImages.length > 0 && (
                                    <button 
                                        className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === 'photos' 
                                                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                        onClick={() => setActiveTab('photos')}
                                    >
                                        Photos
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto scroll-smooth">
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div>
                                    {/* About Section */}
                                    {provider.description && (
                                        <div className="mb-8">
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">About</h3>
                                            <p className="text-gray-600 dark:text-gray-300">{provider.description}</p>
                                            
                                            {provider.joinedDate && (
                                                <div className="mt-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                    <FontAwesomeIcon icon={faHistory} className="mr-2" />
                                                    Member since {provider.joinedDate}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Service Details */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Service Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg flex items-start space-x-3">
                                                <FontAwesomeIcon icon={faTruck} className="text-lg text-blue-500 dark:text-blue-400 mt-0.5" />
                                                <div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Vehicle Type</p>
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">{provider.vehicleType}</p>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg flex items-start space-x-3">
                                                <FontAwesomeIcon icon={faBox} className="text-lg text-blue-500 dark:text-blue-400 mt-0.5" />
                                                <div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Capacity</p>
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">{provider.capacity}</p>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg.gray-750 p-4 rounded-lg flex items-start space-x-3">
                                                <FontAwesomeIcon icon={faMapMarkedAlt} className="text-lg text-blue-500 dark:text-blue-400 mt-0.5" />
                                                <div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Service Area</p>
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">{provider.serviceRadius}</p>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg flex items-start space-x-3">
                                                <FontAwesomeIcon icon={faCoins} className="text-lg text-blue-500 dark:text-blue-400 mt-0.5" />
                                                <div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Starting Price</p>
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">
                                                        {typeof provider.price === 'number' ? `GHS ${provider.price}` : provider.price}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {provider.availability && (
                                                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg flex items-start space-x-3">
                                                    <FontAwesomeIcon icon={faCalendarAlt} className="text-lg text-blue-500 dark:text-blue-400 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Availability</p>
                                                        <p className="font-medium text-gray-800 dark:text-gray-200">{provider.availability}</p>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {provider.responseTime && (
                                                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg flex items-start space-x-3">
                                                    <FontAwesomeIcon icon={faEnvelope} className="text-lg text-blue-500 dark:text-blue-400 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Response Time</p>
                                                        <p className="font-medium text-gray-800 dark:text-gray-200">{provider.responseTime}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Service Types */}
                                    {provider.serviceTypes && provider.serviceTypes.length > 0 && (
                                        <div className="mb-8">
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Services Offered</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {provider.serviceTypes.map((service, index) => (
                                                    <span 
                                                        key={index} 
                                                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                                                    >
                                                        {service}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Verification and Safety */}
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Verification & Safety</h3>
                                        <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 rounded-lg p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-start space-x-3">
                                                    <div className="bg-green-100 dark:bg-green-800/30 rounded-full p-2">
                                                        <FontAwesomeIcon icon={faShieldAlt} className="text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-gray-800 dark:text-gray-200">Trusted Provider</h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {provider.verified ? 'Verified identity and documents' : 'Identity verification in progress'}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center">
                                                    {[
                                                        { icon: faIdCard, label: "ID Verified", verified: provider.verified },
                                                        { icon: faHandshake, label: "Insured", verified: provider.documents?.some(d => d.verified) },
                                                        { icon: faUserCheck, label: "Background Check", verified: provider.verified }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex flex-col items-center mx-2 text-center">
                                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                                                item.verified 
                                                                    ? 'bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400' 
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                                                            }`}>
                                                                <FontAwesomeIcon icon={item.icon} />
                                                            </div>
                                                            <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">{item.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Additional Info */}
                                    {provider.additionalInfo && (
                                        <div className="mb-6">
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Additional Information</h3>
                                            <p className="text-gray-600 dark:text-gray-300">{provider.additionalInfo}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Reviews Tab */}
                            {activeTab === 'reviews' && (
                                <div>
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Customer Reviews</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Rating Summary */}
                                            <div className="col-span-1 bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="text-5xl font-bold text-gray-800 dark:text-white mb-1">{provider.rating.toFixed(1)}</div>
                                                    <div className="flex mb-2">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <FontAwesomeIcon 
                                                                key={`summary-star-${i}`} 
                                                                icon={faStar} 
                                                                className={i < Math.round(provider.rating) ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"} 
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{provider.reviews.length} reviews</p>
                                                </div>
                                                
                                                <div className="mt-4 space-y-2">
                                                    {[5, 4, 3, 2, 1].map(rating => {
                                                        const count = ratingCounts[rating as keyof typeof ratingCounts];
                                                        const percentage = Math.round((count / provider.reviews.length) * 100);
                                                        
                                                        return (
                                                            <div key={rating} className="flex items-center">
                                                                <div className="w-12 text-sm text-gray-600 dark:text-gray-400">{rating} stars</div>
                                                                <div className="flex-1 mx-2">
                                                                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                                                        <div 
                                                                            className="h-2 rounded-full bg-yellow-400" 
                                                                            style={{ width: `${percentage}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                                <div className="w-8 text-right text-sm text-gray-600 dark:text-gray-400">{count}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            
                                            {/* Reviews List */}
                                            <div className="col-span-1 md:col-span-2 space-y-4">
                                                {provider.reviews.slice(0, showFullReviews ? undefined : 3).map((review, index) => (
                                                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center">
                                                                {Array.from({ length: 5 }).map((_, i) => (
                                                                    <FontAwesomeIcon 
                                                                        key={`review-star-${index}-${i}`} 
                                                                        icon={faStar} 
                                                                        className={i < review.rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"} 
                                                                        size="sm"
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">{review.date}</span>
                                                        </div>
                                                        <p className="text-gray-700 dark:text-gray-300 mb-2">"{review.text}"</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">- {review.author}</p>
                                                    </div>
                                                ))}

                                                {provider.reviews.length > 3 && (
                                                    <button 
                                                        onClick={() => setShowFullReviews(!showFullReviews)} 
                                                        className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex items-center"
                                                    >
                                                        {showFullReviews ? 'Show fewer reviews' : `View all ${provider.reviews.length} reviews`}
                                                        {!showFullReviews && <span className="ml-1">→</span>}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Photos Tab */}
                            {activeTab === 'photos' && provider.vehicleImages && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Vehicle Photos</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {provider.vehicleImages.map((image, index) => (
                                            <div key={index} className="aspect-square relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                <img 
                                                    src={image} 
                                                    alt={`${provider.name}'s vehicle ${index + 1}`}
                                                    className="w-full h-full object-cover" 
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer with Action Buttons */}
                        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button 
                                    onClick={handleBook} 
                                    className="flex-1 bg-blue-600 dark:bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 font-medium transition-colors shadow-sm"
                                >
                                    Book Now
                                </button>
                                
                                {provider.phone && (
                                    <a 
                                        href={`tel:${provider.phone}`} 
                                        className="flex-1 sm:flex-none px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center justify-center shadow-sm"
                                    >
                                        <FontAwesomeIcon icon={faPhone} className="mr-2" />
                                        Call
                                    </a>
                                )}
                                
                                <button 
                                    onClick={handleContact} 
                                    className="flex-1 sm:flex-none px-6 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-800 transition-colors flex items-center justify-center shadow-sm"
                                >
                                    <FontAwesomeIcon icon={faCommentAlt} className="mr-2" />
                                    Message
                                </button>
                                
                                <button
                                    className={`flex-1 sm:flex-none px-6 py-3 border-2 ${
                                        isSaved 
                                            ? 'border-red-500 text-red-600 dark:border-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10' 
                                            : 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                                    } rounded-lg transition-colors flex items-center justify-center`}
                                    onClick={handleSave}
                                >
                                    <FontAwesomeIcon icon={faBookmark} className={`mr-2 ${isSaved ? 'text-red-500 dark:text-red-400' : ''}`} />
                                    {isSaved ? 'Saved' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ProviderModal;
