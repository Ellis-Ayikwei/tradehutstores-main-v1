import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, faExclamationTriangle, faInfoCircle, faSort,
  faSortAmountDown, faSortAmountUp, faShieldAlt, faStar, 
  faCheckCircle, faTimesCircle, faClock, faTruck, faUser,
  faPhone, faEnvelope, faMoneyBill, faCalendarAlt, faMapMarkerAlt,
  faFileAlt, faHistory, faThumbsUp, faThumbsDown, faMedal,
  faQuestionCircle, faCreditCard, faCheck, faChevronDown, faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import { format, parseISO } from 'date-fns';

// Types
interface Provider {
  id: string;
  name: string;
  companyName: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  memberSince: string;
  description?: string;
  completedJobs: number;
  verifiedProvider: boolean;
  phone: string;
  email: string;
  insurance?: {
    type: string;
    coverage: string;
    verified: boolean;
  };
  // Provider capabilities/attributes
  vehicleTypes: string[];
  specialties: string[];
  availableHelpers: number;
}

interface Bid {
  id: string;
  provider: Provider;
  amount: number;
  estimatedTime: string; // ISO date string
  message?: string;
  createdAt: string; // ISO date string
  expires?: string; // ISO date string
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  proposedSchedule?: {
    pickupDate: string;
    pickupTime: string;
    estimatedDeliveryDate: string;
    estimatedDeliveryTime: string;
  };
  instantBook?: boolean;
}

interface MoveJob {
  id: string;
  title: string;
  description?: string;
  status: 'bidding' | 'booked' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  pickupLocation: string;
  dropoffLocation: string;
  itemDetails: {
    name: string;
    quantity: number;
  }[];
  preferredDate?: string;
  preferredTimeWindow?: string;
  distance: number;
  estimatedValue: number;
  currency: string;
  bids: Bid[];
  allowInstantBooking: boolean;
}

const BidSelection: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<MoveJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'time'>('price');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    fetchJobDetails();
  }, [id]);
  
  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock job with bids
      const mockJob: MoveJob = {
        id: 'job-12345',
        title: 'Moving furniture from Manchester to London',
        description: 'Need to move a 2-bedroom apartment worth of furniture. Some items require special handling.',
        status: 'bidding',
        createdAt: '2025-03-15T10:30:00Z',
        pickupLocation: 'Manchester, M1 2WD',
        dropoffLocation: 'London, W1T 7HF',
        itemDetails: [
          { name: 'Sofa', quantity: 1 },
          { name: 'Dining Table', quantity: 1 },
          { name: 'Dining Chairs', quantity: 6 },
          { name: 'Wardrobe', quantity: 2 },
          { name: 'Bed (queen)', quantity: 1 },
          { name: 'Boxes (various)', quantity: 15 }
        ],
        preferredDate: '2025-04-10',
        preferredTimeWindow: '9:00 AM - 5:00 PM',
        distance: 257,
        estimatedValue: 400,
        currency: 'GBP',
        allowInstantBooking: true,
        bids: [
          {
            id: 'bid-001',
            provider: {
              id: 'prov-001',
              name: 'Michael Johnson',
              companyName: 'Express Movers Ltd',
              avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
              rating: 4.8,
              reviewCount: 176,
              memberSince: '2022-05-15',
              description: 'Professional moving service with over 10 years of experience in residential and commercial moves.',
              completedJobs: 243,
              verifiedProvider: true,
              phone: '+44 7700 900123',
              email: 'contact@expressmovers.co.uk',
              insurance: {
                type: 'Comprehensive',
                coverage: 'Up to £50,000',
                verified: true
              },
              vehicleTypes: ['Large Van (3.5t)', 'Luton Van with Tail Lift'],
              specialties: ['Furniture Assembly', 'Piano Moving', 'Art & Antiques'],
              availableHelpers: 2
            },
            amount: 380,
            estimatedTime: '2025-04-10T17:00:00Z',
            message: 'We can offer a premium service with 2 experienced movers and all necessary packing materials included. We\'re available on your preferred date.',
            createdAt: '2025-03-16T11:20:00Z',
            expires: '2025-03-23T11:20:00Z',
            status: 'pending',
            proposedSchedule: {
              pickupDate: '2025-04-10',
              pickupTime: '10:00 AM',
              estimatedDeliveryDate: '2025-04-10',
              estimatedDeliveryTime: '5:00 PM'
            }
          },
          {
            id: 'bid-002',
            provider: {
              id: 'prov-002',
              name: 'Sarah Williams',
              companyName: 'Swift Relocations',
              avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
              rating: 4.6,
              reviewCount: 89,
              memberSince: '2023-02-10',
              description: 'Affordable and reliable moving services for homes and offices.',
              completedJobs: 127,
              verifiedProvider: true,
              phone: '+44 7700 900456',
              email: 'info@swiftrelocations.co.uk',
              insurance: {
                type: 'Standard',
                coverage: 'Up to £25,000',
                verified: true
              },
              vehicleTypes: ['Medium Van', 'Large Van (3.5t)'],
              specialties: ['Home Moves', 'Office Relocations'],
              availableHelpers: 2
            },
            amount: 320,
            estimatedTime: '2025-04-10T18:30:00Z',
            message: 'We can provide a cost-effective service with 2 movers. We have availability on your preferred date.',
            createdAt: '2025-03-17T09:15:00Z',
            expires: '2025-03-24T09:15:00Z',
            status: 'pending',
            proposedSchedule: {
              pickupDate: '2025-04-10',
              pickupTime: '11:00 AM',
              estimatedDeliveryDate: '2025-04-10',
              estimatedDeliveryTime: '6:30 PM'
            }
          },
          {
            id: 'bid-003',
            provider: {
              id: 'prov-003',
              name: 'David Thompson',
              companyName: 'Premier Movers',
              avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
              rating: 5.0,
              reviewCount: 42,
              memberSince: '2024-01-05',
              description: 'High-end moving service focusing on careful handling and customer satisfaction.',
              completedJobs: 58,
              verifiedProvider: true,
              phone: '+44 7700 900789',
              email: 'contact@premiermovers.co.uk',
              vehicleTypes: ['Large Van (3.5t) with Tail Lift', 'Small Truck'],
              specialties: ['Luxury Items', 'Fragile Goods', 'Art Transportation'],
              availableHelpers: 3
            },
            amount: 450,
            estimatedTime: '2025-04-10T16:00:00Z',
            message: 'Our premium service includes 3 skilled movers, comprehensive insurance, full packing service, and extra protection for fragile items.',
            createdAt: '2025-03-16T15:45:00Z',
            expires: '2025-03-23T15:45:00Z',
            status: 'pending',
            proposedSchedule: {
              pickupDate: '2025-04-10',
              pickupTime: '9:00 AM',
              estimatedDeliveryDate: '2025-04-10',
              estimatedDeliveryTime: '4:00 PM'
            }
          },
          {
            id: 'bid-004',
            provider: {
              id: 'prov-004',
              name: 'Robert Wilson',
              companyName: 'Budget Moves',
              avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
              rating: 4.2,
              reviewCount: 117,
              memberSince: '2023-08-22',
              description: 'Affordable moving solutions for budget-conscious customers.',
              completedJobs: 185,
              verifiedProvider: false,
              phone: '+44 7700 901234',
              email: 'info@budgetmoves.co.uk',
              vehicleTypes: ['Medium Van', 'Large Van (3.5t)'],
              specialties: ['Student Moves', 'Flat Relocations', 'Single Item Delivery'],
              availableHelpers: 1
            },
            amount: 290,
            estimatedTime: '2025-04-11T14:00:00Z',
            message: 'We offer the most competitive rate with one mover included. Note that we can only do this job on April 11th, not on your preferred date.',
            createdAt: '2025-03-17T13:30:00Z',
            expires: '2025-03-24T13:30:00Z',
            status: 'pending',
            proposedSchedule: {
              pickupDate: '2025-04-11',
              pickupTime: '9:00 AM',
              estimatedDeliveryDate: '2025-04-11',
              estimatedDeliveryTime: '2:00 PM'
            }
          },
          {
            id: 'bid-005',
            provider: {
              id: 'prov-005',
              name: 'James Miller',
              companyName: 'Quick Van Services',
              avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
              rating: 4.4,
              reviewCount: 63,
              memberSince: '2023-11-15',
              description: 'Fast and efficient moving services with transparent pricing.',
              completedJobs: 98,
              verifiedProvider: true,
              phone: '+44 7700 905678',
              email: 'bookings@quickvanservices.co.uk',
              insurance: {
                type: 'Standard',
                coverage: 'Up to £20,000',
                verified: true
              },
              vehicleTypes: ['Small Van', 'Medium Van', 'Large Van (3.5t)'],
              specialties: ['Express Moves', 'Same Day Service'],
              availableHelpers: 2
            },
            amount: 360,
            estimatedTime: '2025-04-10T16:30:00Z',
            message: 'We specialize in efficient moves. Our team will bring all necessary equipment and can offer same-day completion.',
            createdAt: '2025-03-17T16:05:00Z',
            expires: '2025-03-24T16:05:00Z',
            status: 'pending',
            proposedSchedule: {
              pickupDate: '2025-04-10',
              pickupTime: '9:30 AM',
              estimatedDeliveryDate: '2025-04-10',
              estimatedDeliveryTime: '4:30 PM'
            },
            instantBook: true
          }
        ]
      };
      
      setJob(mockJob);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching job details:', err);
      setError('Failed to load job details. Please try again.');
      setLoading(false);
    }
  };

  const sortedBids = job?.bids.slice().sort((a, b) => {
    if (sortBy === 'price') {
      return sortDirection === 'asc' 
        ? a.amount - b.amount 
        : b.amount - a.amount;
    }
    if (sortBy === 'rating') {
      return sortDirection === 'asc'
        ? a.provider.rating - b.provider.rating
        : b.provider.rating - a.provider.rating;
    }
    if (sortBy === 'time') {
      const aTime = new Date(a.estimatedTime).getTime();
      const bTime = new Date(b.estimatedTime).getTime();
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    }
    return 0;
  });

  const toggleSort = (field: 'price' | 'rating' | 'time') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  const toggleProviderDetails = (providerId: string) => {
    setExpandedProviders({
      ...expandedProviders,
      [providerId]: !expandedProviders[providerId]
    });
  };

  const handleSelectBid = (bidId: string) => {
    setSelectedBidId(bidId);
    setShowConfirmation(true);
  };
  
  const confirmSelection = () => {
    setShowConfirmation(false);
    setShowPaymentModal(true);
  };
  
  const handlePayment = () => {
    // In a real app, this would process the payment
    setShowPaymentModal(false);
    
    // Navigate to the booking detail page
    navigate(`/account/bookings/BK-${Math.floor(Math.random() * 100000)}`);
  };
  
  const getSelectedBid = () => {
    return job?.bids.find(bid => bid.id === selectedBidId);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'PPP');
    } catch (e) {
      return dateString;
    }
  };
  
  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'p');
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex justify-center items-center p-4">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-500">Loading available bids...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full p-4 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3" />
            <p>{error || 'Job not found'}</p>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => navigate(-1)}
              className="text-red-700 hover:text-red-900 font-medium"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back navigation */}
        <div className="mb-6">
          <Link 
            to="/account/jobs"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back to My Jobs
          </Link>
        </div>
        
        {/* Job header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                <p className="text-gray-500 mt-1">Job ID: {job.id} • Posted on {formatDate(job.createdAt)}</p>
              </div>
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mt-2 md:mt-0">
                {job.bids.length} {job.bids.length === 1 ? 'bid' : 'bids'} received
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-xs text-gray-500">From</div>
                <div className="font-medium text-gray-900">{job.pickupLocation}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-xs text-gray-500">To</div>
                <div className="font-medium text-gray-900">{job.dropoffLocation}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-xs text-gray-500">Preferred Date</div>
                <div className="font-medium text-gray-900">{job.preferredDate} ({job.preferredTimeWindow})</div>
              </div>
            </div>
            
            {job.description && (
              <div className="mt-4">
                <h2 className="text-sm font-medium text-gray-700">Description</h2>
                <p className="text-sm text-gray-600 mt-1">{job.description}</p>
              </div>
            )}
            
            <div className="mt-4">
              <h2 className="text-sm font-medium text-gray-700">Items to Move</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                {job.itemDetails.map((item, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    {item.quantity} × {item.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bids section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Select a Provider</h2>
              
              {/* Sort options */}
              <div className="flex items-center space-x-4 mt-2 md:mt-0">
                <span className="text-sm text-gray-500">Sort by:</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => toggleSort('price')}
                    className={`px-3 py-1 text-sm rounded ${
                      sortBy === 'price' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Price 
                    {sortBy === 'price' && (
                      <FontAwesomeIcon 
                        icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} 
                        className="ml-2" 
                      />
                    )}
                  </button>
                  <button 
                    onClick={() => toggleSort('rating')}
                    className={`px-3 py-1 text-sm rounded ${
                      sortBy === 'rating' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Rating
                    {sortBy === 'rating' && (
                      <FontAwesomeIcon 
                        icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} 
                        className="ml-2" 
                      />
                    )}
                  </button>
                  <button 
                    onClick={() => toggleSort('time')}
                    className={`px-3 py-1 text-sm rounded ${
                      sortBy === 'time' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Time
                    {sortBy === 'time' && (
                      <FontAwesomeIcon 
                        icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} 
                        className="ml-2" 
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Bid cards */}
            <div className="space-y-6">
              {sortedBids?.map(bid => (
                <div key={bid.id} className="border rounded-lg overflow-hidden">
                  {/* Bid header - always visible */}
                  <div className={`p-4 ${bid.instantBook ? 'bg-green-50' : 'bg-white'}`}>
                    <div className="flex flex-col md:flex-row justify-between">
                      {/* Provider info */}
                      <div className="flex items-start">
                        <img 
                          src={bid.provider.avatar || 'https://via.placeholder.com/60'}
                          alt={bid.provider.name}
                          className="w-12 h-12 rounded-full object-cover mr-4"
                        />
                        <div>
                          <div className="flex items-center flex-wrap">
                            <h3 className="font-bold text-gray-900 mr-2">{bid.provider.companyName}</h3>
                            {bid.provider.verifiedProvider && (
                              <span className="bg-blue-100 text-blue-800 text-xs py-0.5 px-1.5 rounded-full flex items-center">
                                <FontAwesomeIcon icon={faShieldAlt} className="mr-1" />
                                Verified
                              </span>
                            )}
                            {bid.instantBook && (
                              <span className="ml-2 bg-green-100 text-green-800 text-xs py-0.5 px-1.5 rounded-full flex items-center">
                                <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                Instant Book
                              </span>
                            )}
                          </div>
                          <div className="flex items-center mt-1">
                            {[...Array(5)].map((_, i) => (
                              <FontAwesomeIcon 
                                key={i}
                                icon={faStar} 
                                className={i < Math.floor(bid.provider.rating) ? 'text-yellow-400' : 'text-gray-300'}
                                size="sm"
                              />
                            ))}
                            <span className="ml-2 text-gray-600 text-xs">
                              {bid.provider.rating} ({bid.provider.reviewCount} reviews)
                            </span>
                          </div>
                          <p className="text-gray-600 text-xs mt-1">
                            {bid.provider.completedJobs} jobs completed • Member since {formatDate(bid.provider.memberSince)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Bid amount and date */}
                      <div className="mt-4 md:mt-0 md:text-right">
                        <div className="text-2xl font-bold text-gray-900">{job.currency} {bid.amount}</div>
                        <div className="flex items-center justify-end mt-1 text-xs text-gray-500">
                          <FontAwesomeIcon icon={faClock} className="mr-1" />
                          {bid.proposedSchedule ? (
                            <span>
                              {bid.proposedSchedule.pickupDate} ({bid.proposedSchedule.pickupTime})
                            </span>
                          ) : (
                            <span>{formatDate(bid.estimatedTime)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Message from provider */}
                    {bid.message && (
                      <div className="mt-4 bg-gray-50 p-3 rounded-md text-sm text-gray-700 border-l-4 border-gray-300">
                        {bid.message}
                      </div>
                    )}
                    
                    {/* Schedule comparison */}
                    {bid.proposedSchedule && job.preferredDate && bid.proposedSchedule.pickupDate !== job.preferredDate && (
                      <div className="mt-3 bg-yellow-50 p-3 rounded-md text-sm flex items-start">
                        <FontAwesomeIcon icon={faInfoCircle} className="text-yellow-600 mr-2 mt-0.5" />
                        <div>
                          <span className="text-yellow-800 font-medium">Different date than requested</span>
                          <p className="text-yellow-700 text-xs mt-1">
                            You requested {job.preferredDate}, but this provider proposed {bid.proposedSchedule.pickupDate}.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center">
                      <button 
                        onClick={() => toggleProviderDetails(bid.provider.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        <FontAwesomeIcon 
                          icon={expandedProviders[bid.provider.id] ? faChevronUp : faChevronDown} 
                          className="mr-1" 
                        />
                        {expandedProviders[bid.provider.id] ? 'Hide Details' : 'View Provider Details'}
                      </button>
                      
                      <button
                        onClick={() => handleSelectBid(bid.id)}
                        className={`px-4 py-2 rounded-md text-white font-medium mt-3 sm:mt-0 ${
                          bid.instantBook 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {bid.instantBook ? 'Book Instantly' : 'Select This Bid'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded provider details */}
                  {expandedProviders[bid.provider.id] && (
                    <div className="border-t bg-gray-50 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Provider Details</h4>
                          <p className="text-sm text-gray-700 mb-3">{bid.provider.description}</p>
                          
                          {bid.provider.insurance && (
                            <div className="flex items-start mb-3">
                              <FontAwesomeIcon icon={faShieldAlt} className="text-gray-500 mr-2 mt-1" />
                              <div>
                                <p className="text-sm font-medium text-gray-700">Insurance Coverage</p>
                                <p className="text-xs text-gray-600">
                                  {bid.provider.insurance.type}: {bid.provider.insurance.coverage}
                                  {bid.provider.insurance.verified && (
                                    <span className="ml-2 text-green-600">✓ Verified</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-start mb-3">
                            <FontAwesomeIcon icon={faTruck} className="text-gray-500 mr-2 mt-1" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Vehicle Types</p>
                              <p className="text-xs text-gray-600">{bid.provider.vehicleTypes.join(', ')}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start mb-3">
                            <FontAwesomeIcon icon={faMedal} className="text-gray-500 mr-2 mt-1" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Specialties</p>
                              <p className="text-xs text-gray-600">{bid.provider.specialties.join(', ')}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <FontAwesomeIcon icon={faUser} className="text-gray-500 mr-2 mt-1" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Available Movers</p>
                              <p className="text-xs text-gray-600">{bid.provider.availableHelpers} people available for this job</p>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Proposed Schedule</h4>
                          <div className="bg-white p-3 rounded-md border mb-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-gray-500">Pickup Date</p>
                                <p className="font-medium text-gray-800">
                                  {bid.proposedSchedule?.pickupDate || formatDate(bid.estimatedTime)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Pickup Time</p>
                                <p className="font-medium text-gray-800">
                                  {bid.proposedSchedule?.pickupTime || formatTime(bid.estimatedTime)}
                                </p>
                              </div>
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">Delivery Date</p>
                                <p className="font-medium text-gray-800">
                                  {bid.proposedSchedule?.estimatedDeliveryDate || formatDate(bid.estimatedTime)}
                                </p>
                              </div>
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">Estimated Delivery Time</p>
                                <p className="font-medium text-gray-800">
                                  {bid.proposedSchedule?.estimatedDeliveryTime || formatTime(bid.estimatedTime)}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-900 mb-1">Contact Information</h4>
                            <a href={`tel:${bid.provider.phone}`} className="flex items-center text-sm text-blue-600 hover:text-blue-800">
                              <FontAwesomeIcon icon={faPhone} className="mr-2" />
                              {bid.provider.phone}
                            </a>
                            <a href={`mailto:${bid.provider.email}`} className="flex items-center text-sm text-blue-600 hover:text-blue-800">
                              <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                              {bid.provider.email}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-blue-50 p-4 rounded-md">
              <div className="flex items-start">
                <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 mr-3 mt-1" />
                <div>
                  <h3 className="text-blue-800 font-medium">Need Help Choosing?</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Look for verified providers with high ratings and reviews. If you need your items moved quickly, consider using Instant Book. Still not sure? Contact our support team for assistance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bid confirmation modal */}
      {showConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Your Selection</h3>
            
            {getSelectedBid() && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="font-medium">{getSelectedBid()?.provider.companyName}</div>
                  <div className="font-bold text-xl">{job.currency} {getSelectedBid()?.amount}</div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md mb-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Pickup Date</p>
                      <p className="font-medium">
                        {getSelectedBid()?.proposedSchedule?.pickupDate || formatDate(getSelectedBid()!.estimatedTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pickup Time</p>
                      <p className="font-medium">
                        {getSelectedBid()?.proposedSchedule?.pickupTime || formatTime(getSelectedBid()!.estimatedTime)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {getSelectedBid()?.instantBook ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                    This is an Instant Book provider. Your booking will be confirmed immediately.
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                    <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                    By confirming, you're accepting this provider's bid for your move.
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmSelection}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Your Booking</h3>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <div className="font-medium text-gray-700">Service Fee</div>
                <div className="font-bold">{job.currency} {getSelectedBid()?.amount}</div>
              </div>
              
              <div className="flex justify-between items-center mb-3">
                <div className="font-medium text-gray-700">Deposit (25%)</div>
                <div>{job.currency} {(getSelectedBid()!.amount * 0.25).toFixed(2)}</div>
              </div>
              
              <div className="border-t border-gray-200 my-2"></div>
              
              <div className="flex justify-between items-center">
                <div className="font-bold">Due Now</div>
                <div className="font-bold">{job.currency} {(getSelectedBid()!.amount * 0.25).toFixed(2)}</div>
              </div>
              
              <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                <div>Balance Due on Completion</div>
                <div>{job.currency} {(getSelectedBid()!.amount * 0.75).toFixed(2)}</div>
              </div>
            </div>
            
            <div className="mb-4 bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">Payment Method</h4>
              <div className="flex items-center space-x-3 mb-3">
                <FontAwesomeIcon icon={faCreditCard} className="text-gray-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Credit Card (**** 1234)</div>
                  <div className="text-xs text-gray-500">Expires 09/27</div>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Default</div>
              </div>
              <button className="text-blue-600 hover:text-blue-800 text-sm">Use a different payment method</button>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 mb-4">
              <FontAwesomeIcon icon={faShieldAlt} className="mr-2" />
              Your payment is secured by our Payment Protection Policy.
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handlePayment}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                Complete Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BidSelection;