import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faStar,
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faGlobe,
  faTruck,
  faUser,
  faIdCard,
  faCalendarAlt,
  faCheckCircle,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';

interface Vehicle {
  id: string;
  type: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  capacity: string;
  status: 'active' | 'maintenance' | 'inactive';
  lastInspection: string;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: 'active' | 'inactive' | 'on_leave';
  joiningDate: string;
  emergencyContact: string;
  assignedVehicleId?: string;
}

interface Provider {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  rating: number;
  reviewCount: number;
  services: string[];
  operatingAreas: string[];
  websiteUrl?: string;
  status: 'active' | 'inactive';
  verificationStatus: 'verified' | 'unverified';
  vehicles: Vehicle[];
  drivers: Driver[];
}

const ProviderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchProviderDetails();
  }, [id]);

  const fetchProviderDetails = async () => {
    setLoading(true);
    
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock data for provider details
      const mockProvider: Provider = {
        id: id || 'P-102',
        name: 'Quick Transport',
        email: 'support@quicktransport.com',
        phone: '(555) 234-5678',
        address: '2345 Moving Blvd, Chicago, IL 60007',
        description: 'Quick Transport is a leading logistics provider with a proven track record of reliable and efficient transportation services. Specializing in both short and long-distance deliveries, our experienced team ensures your items arrive safely and on time.',
        rating: 4.7,
        reviewCount: 128,
        services: ['Furniture Moving', 'Appliance Delivery', 'Commercial Shipping', 'Express Delivery'],
        operatingAreas: ['Chicago', 'Milwaukee', 'Detroit', 'Indianapolis'],
        websiteUrl: 'https://quicktransport.com',
        status: 'active',
        verificationStatus: 'verified',
        vehicles: [
          {
            id: 'v1',
            type: 'Box Truck',
            make: 'Ford',
            model: 'E-450',
            year: 2021,
            registrationNumber: 'IL-12345',
            capacity: '16 ft / 3,000kg',
            status: 'active',
            lastInspection: '2025-01-15'
          },
          {
            id: 'v2',
            type: 'Van',
            make: 'Mercedes-Benz',
            model: 'Sprinter',
            year: 2022,
            registrationNumber: 'IL-67890',
            capacity: '12 ft / 2,000kg',
            status: 'active',
            lastInspection: '2025-02-20'
          },
          {
            id: 'v3',
            type: 'Pickup Truck',
            make: 'Chevrolet',
            model: 'Silverado',
            year: 2023,
            registrationNumber: 'IL-24680',
            capacity: '8 ft / 1,500kg',
            status: 'active',
            lastInspection: '2025-03-10'
          }
        ],
        drivers: [
          {
            id: 'd1',
            name: 'John Smith',
            email: 'john@quicktransport.com',
            phone: '(555) 111-2222',
            licenseNumber: 'DL-987654',
            licenseExpiry: '2027-06-30',
            status: 'active',
            joiningDate: '2022-03-15',
            emergencyContact: '(555) 333-4444',
            assignedVehicleId: 'v1'
          },
          {
            id: 'd2',
            name: 'Sarah Johnson',
            email: 'sarah@quicktransport.com',
            phone: '(555) 555-6666',
            licenseNumber: 'DL-123456',
            licenseExpiry: '2026-04-22',
            status: 'active',
            joiningDate: '2023-01-10',
            emergencyContact: '(555) 777-8888',
            assignedVehicleId: 'v2'
          },
          {
            id: 'd3',
            name: 'Michael Rodriguez',
            email: 'michael@quicktransport.com',
            phone: '(555) 999-0000',
            licenseNumber: 'DL-654321',
            licenseExpiry: '2026-08-15',
            status: 'active',
            joiningDate: '2022-11-05',
            emergencyContact: '(555) 111-3333',
            assignedVehicleId: 'v3'
          }
        ]
      };
      
      setProvider(mockProvider);
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          {error || "Provider not found"}
        </div>
      </div>
    );
  }

  const getVehicleForDriver = (assignedVehicleId?: string) => {
    if (!assignedVehicleId) return null;
    return provider.vehicles.find(v => v.id === assignedVehicleId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link to="/providers" className="text-blue-600 hover:text-blue-800 mr-4">
            <FontAwesomeIcon icon={faArrowLeft} /> Back to Providers
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/4 mb-4 md:mb-0">
                <div className="w-full h-40 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-5xl">
                  {provider.name.charAt(0)}
                </div>
              </div>
              
              <div className="md:w-3/4 md:pl-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold">{provider.name}</h1>
                  
                  <div className="flex items-center mt-2 md:mt-0">
                    <div className="flex items-center text-yellow-400 mr-4">
                      <FontAwesomeIcon icon={faStar} />
                      <span className="ml-1 text-gray-700">{provider.rating}</span>
                      <span className="ml-1 text-gray-500">({provider.reviewCount} reviews)</span>
                    </div>
                    
                    {provider.verificationStatus === 'verified' && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                        <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                        Verified Provider
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center text-gray-600">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-400 mr-2" />
                    <span>{provider.address}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <FontAwesomeIcon icon={faPhone} className="text-gray-400 mr-2" />
                    <span>{provider.phone}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 mr-2" />
                    <span>{provider.email}</span>
                  </div>
                  
                  {provider.websiteUrl && (
                    <div className="flex items-center text-gray-600">
                      <FontAwesomeIcon icon={faGlobe} className="text-gray-400 mr-2" />
                      <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        {provider.websiteUrl.replace(/(^\w+:|^)\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <div className="font-medium mb-2">Operating Areas</div>
                  <div className="flex flex-wrap">
                    {provider.operatingAreas.map((area, index) => (
                      <span key={index} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm mr-2 mb-2">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium mb-2">Services</div>
                  <div className="flex flex-wrap">
                    {provider.services.map((service, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm mr-2 mb-2">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="flex overflow-x-auto border-b border-gray-200">
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${
              activeTab === 'vehicles'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('vehicles')}
          >
            Available Vehicles ({provider.vehicles.filter(v => v.status === 'active').length})
          </button>
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${
              activeTab === 'drivers'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('drivers')}
          >
            Our Drivers ({provider.drivers.filter(d => d.status === 'active').length})
          </button>
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews ({provider.reviewCount})
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="mb-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">About {provider.name}</h2>
            <p className="text-gray-700 mb-6">{provider.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Top Services</h3>
                <ul className="space-y-2">
                  {provider.services.slice(0, 4).map((service, index) => (
                    <li key={index} className="flex items-center text-gray-700">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" />
                      {service}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Featured Vehicles</h3>
                <ul className="space-y-2">
                  {provider.vehicles.slice(0, 3).map((vehicle) => (
                    <li key={vehicle.id} className="flex items-center text-gray-700">
                      <FontAwesomeIcon icon={faTruck} className="text-blue-500 mr-2" />
                      {vehicle.type}: {vehicle.make} {vehicle.model} ({vehicle.capacity})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="mt-6">
              <Link to="/service-request" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md">
                Request Service
              </Link>
            </div>
          </div>
        )}
        
        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Our Fleet</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {provider.vehicles.map((vehicle) => (
                <div key={vehicle.id} className={`border rounded-lg overflow-hidden ${
                  vehicle.status === 'active' ? 'border-green-200' : 
                  vehicle.status === 'maintenance' ? 'border-yellow-200' : 'border-red-200'
                }`}>
                  <div className={`p-4 ${
                    vehicle.status === 'active' ? 'bg-green-50' :
                    vehicle.status === 'maintenance' ? 'bg-yellow-50' : 'bg-red-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{vehicle.make} {vehicle.model}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                        vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-center mb-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faTruck} className="text-gray-500 text-2xl" />
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span className="text-gray-900 font-medium">{vehicle.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Year:</span>
                        <span className="text-gray-900">{vehicle.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Capacity:</span>
                        <span className="text-gray-900">{vehicle.capacity}</span>
                      </div>
                      
                      {vehicle.status === 'active' && (
                        <div className="pt-3 mt-3 border-t border-gray-100">
                          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded">
                            Book This Vehicle
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Drivers Tab */}
        {activeTab === 'drivers' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Professional Drivers</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {provider.drivers.map((driver) => {
                const assignedVehicle = getVehicleForDriver(driver.assignedVehicleId);
                
                return (
                  <div key={driver.id} className={`border rounded-lg overflow-hidden ${
                    driver.status === 'active' ? 'border-green-200' : 
                    driver.status === 'on_leave' ? 'border-yellow-200' : 'border-red-200'
                  }`}>
                    <div className={`p-4 ${
                      driver.status === 'active' ? 'bg-green-50' :
                      driver.status === 'on_leave' ? 'bg-yellow-50' : 'bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{driver.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          driver.status === 'active' ? 'bg-green-100 text-green-800' :
                          driver.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {driver.status === 'on_leave' ? 'On Leave' : driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                          <FontAwesomeIcon icon={faUser} className="text-gray-500 text-2xl" />
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-700 mb-1">
                          <FontAwesomeIcon icon={faIdCard} className="text-gray-400 mr-2 w-4" />
                          <span>Professional Driver</span>
                        </div>
                        
                        <div className="flex items-center text-gray-700 mb-1">
                          <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 mr-2 w-4" />
                          <span>Joined {new Date(driver.joiningDate).toLocaleDateString()}</span>
                        </div>
                        
                        {assignedVehicle && (
                          <div className="flex items-center text-gray-700 mb-1">
                            <FontAwesomeIcon icon={faTruck} className="text-gray-400 mr-2 w-4" />
                            <span>Drives: {assignedVehicle.make} {assignedVehicle.model}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Customer Reviews</h2>
              <div className="flex items-center">
                <div className="text-4xl font-bold text-gray-900 mr-2">{provider.rating}</div>
                <div>
                  <div className="flex items-center text-yellow-400 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <FontAwesomeIcon 
                        key={i} 
                        icon={faStar} 
                        className={i < Math.floor(provider.rating) ? "text-yellow-400" : "text-gray-300"} 
                      />
                    ))}
                  </div>
                  <div className="text-sm text-gray-500">{provider.reviewCount} reviews</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">
                  Reviews are coming soon! Check back later to see what customers are saying about this provider.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Request Service Button (Fixed at Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-center">
        <Link to="/service-request" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-md shadow-md">
          Request Service from {provider.name}
        </Link>
      </div>
    </div>
  );
};

export default ProviderDetail;