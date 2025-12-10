import { faFilter, faInfoCircle, faMapMarkerAlt, faSort, faStar, faTruck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

interface Provider {
    id: string;
    name: string;
    image: string;
    rating: number;
    reviewCount: number;
    price: number;
    vehicleType: string;
    availableTime: string;
    description: string;
    services: string[];
    distance: number;
    vehicleCount?: number;
    driverCount?: number;
}

interface ServiceRequest {
    id: string;
    pickup_location: string;
    dropoff_location: string;
    itemType: string;
    item_size: string;
    preferred_time: string;
}

const ProviderListings: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const navigate = useNavigate();
    const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string[]>([]);
    const [priceRangeFilter, setPriceRangeFilter] = useState<[number, number]>([0, 1000]);
    const [sortBy, setSortBy] = useState<string>('rating');

    useEffect(() => {
        // In a real app, these would be API calls
        const fetchServiceRequest = async () => {
            try {
                setLoading(true);

                // Simulate API call
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Mock data
                const mockServiceRequest: ServiceRequest = {
                    id: requestId || 'SR-12345',
                    pickup_location: '123 Main St, New York, NY',
                    dropoff_location: '456 Park Ave, New York, NY',
                    itemType: 'Furniture',
                    item_size: 'Large',
                    preferred_time: '2023-06-20T14:00:00',
                };

                setServiceRequest(mockServiceRequest);

                // Fetch providers for this request
                await fetchProviders();
            } catch (err) {
                setError('Failed to load service request. Please try again.');
                console.error('Error fetching service request:', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchProviders = async () => {
            try {
                // Simulate API call
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Mock data
                const mockProviders: Provider[] = [
                    {
                        id: 'P-123',
                        name: "John's Moving Services",
                        image: 'https://randomuser.me/api/portraits/men/1.jpg',
                        rating: 4.8,
                        reviewCount: 156,
                        price: 120.0,
                        vehicleType: 'Large Van',
                        availableTime: '2023-06-20T15:00:00',
                        description: 'Professional moving service with 10+ years of experience. Specializing in furniture and delicate items.',
                        services: ['Furniture', 'Packing', 'Assembly'],
                        distance: 2.5,
                        vehicleCount: 4,
                        driverCount: 6
                    },
                    {
                        id: 'P-124',
                        name: "Quick Transport",
                        image: 'https://randomuser.me/api/portraits/men/2.jpg',
                        rating: 4.7,
                        reviewCount: 128,
                        price: 110.0,
                        vehicleType: 'Box Truck',
                        availableTime: '2023-06-20T14:30:00',
                        description: 'Reliable and efficient transportation services with a fleet of various vehicles for all your moving needs.',
                        services: ['Furniture Moving', 'Appliance Delivery', 'Commercial Shipping'],
                        distance: 3.2,
                        vehicleCount: 8,
                        driverCount: 10
                    },
                    {
                        id: 'P-125',
                        name: "City Movers",
                        image: 'https://randomuser.me/api/portraits/women/3.jpg',
                        rating: 4.5,
                        reviewCount: 92,
                        price: 95.0,
                        vehicleType: 'Small Van',
                        availableTime: '2023-06-20T16:00:00',
                        description: 'Fast and affordable moving service within city limits. Perfect for small to medium-sized moves.',
                        services: ['Small Items', 'Student Moving', 'Same-Day Service'],
                        distance: 1.8,
                        vehicleCount: 5,
                        driverCount: 8
                    }
                ];

                setProviders(mockProviders);
            } catch (err) {
                setError('Failed to load providers. Please try again.');
                console.error('Error fetching providers:', err);
            }
        };

        fetchServiceRequest();
    }, [requestId]);

    const handleBookProvider = (providerId: string) => {
        navigate(`/booking-confirmation/${requestId}/${providerId}`);
    };
    
    const handleViewProviderDetails = (providerId: string) => {
        navigate(`/providers/${providerId}`);
    };

    const filteredProviders = providers
        .filter((provider) => (vehicleTypeFilter.length === 0 || vehicleTypeFilter.includes(provider.vehicleType)) && provider.price >= priceRangeFilter[0] && provider.price <= priceRangeFilter[1])
        .sort((a, b) => {
            switch (sortBy) {
                case 'rating':
                    return b.rating - a.rating;
                case 'price_low':
                    return a.price - b.price;
                case 'price_high':
                    return b.price - a.price;
                case 'distance':
                    return a.distance - b.distance;
                default:
                    return 0;
            }
        });

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !serviceRequest) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error || 'Service request not found.'}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <Link to="/service-request" className="text-blue-600 hover:text-blue-800">
                    &larr; Back to Service Request
                </Link>
            </div>

            <h1 className="text-2xl font-bold mb-6">Available Providers</h1>

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h2 className="font-semibold mb-2">Your Request Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-gray-500">Pickup Location</div>
                            <div className="flex items-start">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-500 mt-1 mr-2 flex-shrink-0" />
                                <div>{serviceRequest.pickup_location}</div>
                            </div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500">Dropoff Location</div>
                            <div className="flex items-start">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                                <div>{serviceRequest.dropoff_location}</div>
                            </div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500">Item Type</div>
                            <div>
                                {serviceRequest.itemType} - {serviceRequest.item_size}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500">Preferred Time</div>
                            <div>{new Date(serviceRequest.preferred_time).toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div className="mb-4 md:mb-0">
                        <p className="text-gray-600">{filteredProviders.length} providers available for your request</p>
                    </div>

                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="relative">
                            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50">
                                <FontAwesomeIcon icon={faFilter} className="mr-2" />
                                Filter
                            </button>

                            {showFilters && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 p-2">
                                    <div className="p-2">
                                        <h3 className="font-medium mb-2">Vehicle Type</h3>
                                        <div className="space-y-2">
                                            {['Large Van', 'Small Van', 'Box Truck', 'Pickup Truck'].map((type) => (
                                                <label key={type} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={vehicleTypeFilter.includes(type)}
                                                        onChange={() => {
                                                            if (vehicleTypeFilter.includes(type)) {
                                                                setVehicleTypeFilter(vehicleTypeFilter.filter((t) => t !== type));
                                                            } else {
                                                                setVehicleTypeFilter([...vehicleTypeFilter, type]);
                                                            }
                                                        }}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">{type}</span>
                                                </label>
                                            ))}
                                        </div>

                                        <h3 className="font-medium mb-2 mt-4">Price Range</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-700">${priceRangeFilter[0]}</span>
                                                <span className="text-sm text-gray-700">${priceRangeFilter[1]}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1000"
                                                step="50"
                                                value={priceRangeFilter[1]}
                                                onChange={(e) => setPriceRangeFilter([priceRangeFilter[0], parseInt(e.target.value)])}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    setVehicleTypeFilter([]);
                                                    setPriceRangeFilter([0, 1000]);
                                                }}
                                                className="text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                Reset Filters
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="appearance-none px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 pr-8 hover:bg-gray-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="rating">Sort by: Rating</option>
                                <option value="price_low">Sort by: Price (Low to High)</option>
                                <option value="price_high">Sort by: Price (High to Low)</option>
                                <option value="distance">Sort by: Distance</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <FontAwesomeIcon icon={faSort} className="text-gray-400" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {filteredProviders.length === 0 ? (
                        <div className="text-center py-8">
                            <FontAwesomeIcon icon={faTruck} className="mx-auto text-gray-400 text-5xl mb-4" />
                            <h3 className="text-xl font-medium text-gray-900 mb-1">No providers found</h3>
                            <p className="text-gray-500">Try adjusting your filters or check back later</p>
                        </div>
                    ) : (
                        filteredProviders.map((provider) => (
                            <div key={provider.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row">
                                    <div className="md:w-1/4 mb-4 md:mb-0 md:pr-6">
                                        <img
                                            src={provider.image}
                                            alt={provider.name}
                                            className="w-full h-40 object-cover rounded-lg"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = 'https://via.placeholder.com/150?text=Provider';
                                            }}
                                        />
                                    </div>

                                    <div className="md:w-2/4 mb-4 md:mb-0">
                                        <div className="flex items-center mb-2">
                                            <h2 className="text-xl font-semibold mr-2">{provider.name}</h2>
                                            <div className="flex items-center text-yellow-400">
                                                <FontAwesomeIcon icon={faStar} />
                                                <span className="ml-1 text-gray-700">{provider.rating}</span>
                                                <span className="ml-1 text-gray-500">({provider.reviewCount} reviews)</span>
                                            </div>
                                        </div>

                                        <p className="text-gray-600 mb-4">{provider.description}</p>

                                        <div className="mb-4">
                                            <div className="flex items-center text-gray-600 mb-2">
                                                <FontAwesomeIcon icon={faTruck} className="mr-2" />
                                                <span>{provider.vehicleType}</span>
                                                {provider.vehicleCount && (
                                                    <span className="ml-2 text-sm text-gray-500">
                                                        (Fleet of {provider.vehicleCount} vehicles)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center text-gray-600 mb-2">
                                                <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                                                <span>{provider.distance}km away</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap">
                                            {provider.services.map((service, index) => (
                                                <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-2">
                                                    {service}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="md:w-1/4 flex flex-col items-center justify-center border-t pt-4 md:pt-0 md:border-t-0 md:border-l md:pl-6">
                                        <div className="text-2xl font-bold text-gray-900 mb-2">${provider.price.toFixed(2)}</div>

                                        <div className="text-sm text-gray-500 mb-4">Available at {new Date(provider.availableTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>

                                        <button 
                                            onClick={() => handleViewProviderDetails(provider.id)} 
                                            className="w-full mb-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-2 px-4 rounded flex items-center justify-center"
                                        >
                                            <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                                            View Details
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleBookProvider(provider.id)} 
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                                        >
                                            Book Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProviderListings;
