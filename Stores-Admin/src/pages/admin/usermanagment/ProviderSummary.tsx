import React from 'react';
import {
  Truck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star
} from 'lucide-react';
import { Provider } from './types';
import { formatDate, getStatusBadgeClass, getVerificationBadgeClass } from '../ProviderManagement/ProviderDetail/utils';

interface ProviderSummaryProps {
  provider: Provider;
}

export const ProviderSummary: React.FC<ProviderSummaryProps> = ({ provider }) => {
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
      <div className="p-6">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/4 mb-6 md:mb-0 flex justify-center md:justify-start">
            <div className="h-32 w-32 bg-gray-100 rounded-full flex items-center justify-center">
              <Truck className="text-gray-500 h-12 w-12" />
            </div>
          </div>
          <div className="md:w-3/4">
            <div className="flex flex-col md:flex-row md:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{provider.company_name}</h3>
                <div className="flex items-center mt-2 space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(provider.user.account_status)}`}>
                    {provider.user.account_status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getVerificationBadgeClass(provider.verification_status)}`}>
                    {provider.verification_status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="flex items-center mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(parseFloat(provider.user.rating))
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-sm font-medium">{provider.user.rating}</span>
                  </div>
                  <span className="ml-2 text-sm text-gray-500">({provider.completed_bookings_count} Jobs)</span>
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" /> Joined: {formatDate(provider.user.date_joined)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-start">
                <Mail className="text-gray-400 w-4 h-4 mt-1 mr-3" />
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="text-sm">{provider.user.email}</div>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="text-gray-400 w-4 h-4 mt-1 mr-3" />
                <div>
                  <div className="text-xs text-gray-500">Phone</div>
                  <div className="text-sm">{provider.user.phone_number}</div>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="text-gray-400 w-4 h-4 mt-1 mr-3" />
                <div>
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="text-sm">{provider.base_location || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 