import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faTruck, faCalendarAlt, faTimes } from '@fortawesome/free-solid-svg-icons';

interface ProviderInfoProps {
  provider: {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
    reviewCount: number;
    company?: string;
    email?: string;
    phone?: string;
  };
  booking?: {
    id: string;
    status: string;
    date: string;
    service: string;
  };
  onClose: () => void;
}

const ProviderInfo: React.FC<ProviderInfoProps> = ({
  provider,
  booking,
  onClose
}) => {
  return (
    <div className="h-full border-l dark:border-gray-700 bg-white dark:bg-gray-800 w-80 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h3 className="font-medium text-gray-800 dark:text-white">Details</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      
      <div className="p-4">
        <div className="flex flex-col items-center mb-6">
          {provider.avatar ? (
            <img 
              src={provider.avatar} 
              alt={provider.name} 
              className="w-24 h-24 rounded-full object-cover mb-3"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3">
              <span className="text-gray-500 font-medium text-2xl">
                {provider.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">{provider.name}</h3>
          
          {provider.company && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">{provider.company}</p>
          )}
          
          <div className="flex items-center mt-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <FontAwesomeIcon 
                key={index}
                icon={faStar}
                className={`${
                  index < Math.floor(provider.rating) 
                    ? 'text-yellow-400' 
                    : index < provider.rating 
                    ? 'text-yellow-300' 
                    : 'text-gray-300 dark:text-gray-600'
                } w-4 h-4`}
              />
            ))}
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              {provider.rating} ({provider.reviewCount} reviews)
            </span>
          </div>
        </div>
        
        {booking && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-800 dark:text-white uppercase tracking-wide mb-3">
              Booking Information
            </h4>
            
            <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3">
              <div className="flex items-start mb-2">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-500 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Booking #{booking.id}</p>
                  <p className="text-xs text-gray-500">{booking.date}</p>
                </div>
              </div>
              
              <div className="flex items-start mb-2">
                <FontAwesomeIcon icon={faTruck} className="text-gray-500 mt-1 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{booking.service}</p>
                  <p className="text-xs text-gray-500">Status: <span className="font-medium">{booking.status}</span></p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div>
          <h4 className="text-sm font-medium text-gray-800 dark:text-white uppercase tracking-wide mb-3">
            Contact Information
          </h4>
          
          <div className="space-y-3">
            {provider.phone && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{provider.phone}</p>
              </div>
            )}
            
            {provider.email && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{provider.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderInfo;