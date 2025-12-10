import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faClock, faBox, faMoneyBill, faRoute, faWeight, faUser, faStar, faExclamationCircle, faCalendarAlt, faArrowRight, faTruck } from '@fortawesome/free-solid-svg-icons';
import { Job } from '../pages/provider/types';

interface JobCardProps {
    job: Job;
    onClick: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onClick }) => {
    const pickupLocation = job.request.all_locations.find((loc) => loc.type === 'pickup');
    const dropoffLocations = job.request.all_locations.filter((loc) => loc.type === 'dropoff');
    const totalWeight = job.request.moving_items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const isUrgent = job.request.priority === 'high';
    const isMultiStop = dropoffLocations.length > 1;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden" onClick={() => onClick(job)}>
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center">
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">{job.request.tracking_number}</span>
                            {isUrgent && <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-full">Urgent</span>}
                            <span
                                className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                                    job.request.request_type === 'instant'
                                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                        : job.request.request_type === 'auction'
                                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                                        : 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
                                }`}
                            >
                                {job.request.request_type.charAt(0).toUpperCase() + job.request.request_type.slice(1)}
                            </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{job.request.service_type}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">£{parseFloat(job.request.base_price).toFixed(2)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Min bid: £{parseFloat(job.minimum_bid).toFixed(2)}</div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-start">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-1 mr-2" />
                        <div className="flex-1">
                            <div className="text-sm text-gray-900 dark:text-gray-100">{pickupLocation?.address}</div>
                            {isMultiStop ? (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{dropoffLocations.length} delivery stops</div>
                            ) : (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{dropoffLocations[0]?.address}</div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(job.request.preferred_pickup_date || '').toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{job.request.preferred_pickup_time}</span>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faBox} className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{job.request.moving_items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faWeight} className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{totalWeight} kg</span>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faRoute} className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{job.request.estimated_distance?.toFixed(1)}km</span>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faTruck} className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{job.request.service_level}</span>
                        </div>
                    </div>
                </div>

                {job.request.requires_special_handling && (
                    <div className="mt-4 flex items-center text-amber-600 dark:text-amber-400">
                        <FontAwesomeIcon icon={faExclamationCircle} className="w-4 h-4 mr-2" />
                        <span className="text-sm">Requires special handling</span>
                    </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{job.request.contact_name}</span>
                    </div>
                    <button
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick(job);
                        }}
                    >
                        View Details
                        <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 ml-2" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JobCard;
