import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faClock, faMapMarkerAlt, faBox, faDollarSign, faUser, faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import axiosInstance from '../../services/axiosInstance';
import { ServiceRequest } from '../../types';

const ProviderJobDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState<boolean>(true);
    const [request, setRequest] = useState<ServiceRequest | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        const fetchServiceRequest = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get(`/api/service-requests/${id}`);
                setRequest(response.data);
                setStatus(response.data.status);
                setError(null);
            } catch (err) {
                console.error('Error fetching service request:', err);
                setError('Failed to load service request');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchServiceRequest();
        }
    }, [id]);

    const handleStatusChange = async (newStatus: string) => {
        try {
            await axiosInstance.patch(`/api/service-requests/${id}/status`, { status: newStatus });
            setStatus(newStatus);
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                <p>{error || 'Service request not found'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Details</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => handleStatusChange('accepted')}
                        disabled={status === 'accepted'}
                        className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                            status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                    >
                        <FontAwesomeIcon icon={faCheck} />
                        <span>Accept Job</span>
                    </button>
                    <button
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={status === 'in_progress'}
                        className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                            status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        <FontAwesomeIcon icon={faClock} />
                        <span>Start Job</span>
                    </button>
                    <button
                        onClick={() => handleStatusChange('completed')}
                        disabled={status === 'completed'}
                        className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                            status === 'completed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                    >
                        <FontAwesomeIcon icon={faCheck} />
                        <span>Complete Job</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-3" />
                            <span>{request.contactName}</span>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faPhone} className="text-gray-400 mr-3" />
                            <span>{request.contactPhone}</span>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 mr-3" />
                            <span>{request.contactEmail}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Job Details</h2>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faBox} className="text-gray-400 mr-3" />
                            <span>Type: {request.requestType}</span>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faDollarSign} className="text-gray-400 mr-3" />
                            <span>Price: ${request.finalPrice || request.basePrice}</span>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-400 mr-3" />
                            <span>Pickup: {request.pickupLocation?.address}</span>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-400 mr-3" />
                            <span>Dropoff: {request.dropoffLocation?.address}</span>
                        </div>
                    </div>
                </div>
            </div>

            {request.moving_items && request.moving_items.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Items to Move</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {request.moving_items.map((item) => (
                            <div key={item.id} className="border rounded-lg p-4">
                                <h3 className="font-medium">{item.name}</h3>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <p>Quantity: {item.quantity}</p>
                                    {item.dimensions && (
                                <p>Dimensions: {
                                    (() => {
                                        const dims = item.dimensions;
                                        if (!dims) return 'N/A';
                                        
                                        if (typeof dims === 'string') {
                                            // Try to parse string format
                                            const match = dims.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
                                            if (match) {
                                                const [, width, height, length, unit] = match;
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit}`;
                                            }
                                            return dims;
                                        }
                                        
                                        if (typeof dims === 'object') {
                                            const { unit, width, height, length } = dims as any;
                                            if (width && height && length) {
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
                                            }
                                        }
                                        
                                        return 'N/A';
                                    })()
                                }</p>
                            )}
                                    {item.weight && <p>Weight: {item.weight} kg</p>}
                                    {item.fragile && <p className="text-red-500">Fragile Item</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {request.special_instructions && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Special Instructions</h2>
                    <p className="text-gray-600 dark:text-gray-400">{request.special_instructions}</p>
                </div>
            )}
        </div>
    );
};

export default ProviderJobDetail;
