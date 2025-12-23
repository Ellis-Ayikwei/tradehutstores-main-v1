import React from 'react';
import axiosInstance from '../../../../services/axiosInstance';
import showMessage from '../../../../helper/showMessage';
import showRequestError from '../../../../helper/showRequestError';
import { IconUser, IconMail, IconPhone, IconTag, IconShield, IconTruck } from '@tabler/icons-react';

interface RequestBasicInfoTabProps {
    formData: any;
    isEditing: boolean;
    onFormChange: (field: string, value: any) => void;
    serviceCategories?: any[];
    services?: any[];
    providers?: any[];
    drivers?: any[];
    saving?: boolean;
    hasChanges?: boolean;
    requestId?: string;
    onRefetch?: () => void;
    onCancelTab?: () => void;
    setIsEditing?: (v: boolean) => void;
}

const RequestBasicInfoTab: React.FC<RequestBasicInfoTabProps> = ({
    formData,
    isEditing,
    onFormChange,
    serviceCategories = [],
    services = [],
    providers = [],
    drivers = [],
    saving = false,
    hasChanges = false,
    requestId,
    onRefetch = () => {},
    onCancelTab = () => {},
    setIsEditing = () => {}
}) => {
    console.log("services", services);
    const handleSave = async () => {
        if (!requestId) return;
        try {
            const payload: any = {
                contact_name: formData.contact_name,
                contact_phone: formData.contact_phone,
                contact_email: formData.contact_email,
                request_type: formData.request_type,
                status: formData.status,
                priority: formData.priority,
                service_level: formData.service_level,
                service_type: formData.service_type,
            };
            
            // Include service_id if available
            if (formData.service_id || formData.service?.id) {
                payload.service_id = formData.service_id || formData.service?.id;
            }
            
            await axiosInstance.patch(`/instant-requests/${requestId}/update-basic/`, payload);
            showMessage('Basic info updated');
            onRefetch();
            setIsEditing(false);
        } catch (error) {
            showRequestError(error);
        }
    };
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Basic Information</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Edit the basic details of this request including contact information and service type.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => { onCancelTab(); }}
                                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !hasChanges}
                                className={`px-3 py-2 text-sm font-medium rounded-lg ${hasChanges ? 'text-white bg-green-600 hover:bg-green-700' : 'text-gray-400 bg-gray-300 cursor-not-allowed'}`}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                        >
                            Edit
                        </button>
                    )}
                </div>
            </div>
            

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Request Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Request Type
                    </label>
                    <div className="relative">
                        <select
                            value={formData.request_type || ''}
                            onChange={(e) => onFormChange('request_type', e.target.value)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        >
                            <option value="instant">Instant</option>
                            <option value="journey">Journey</option>
                        </select>
                        <IconTruck className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                    </div>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status
                    </label>
                    <div className="relative">
                        <select
                            value={formData.status || ''}
                            onChange={(e) => onFormChange('status', e.target.value)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        >
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="bidding">Bidding in Progress</option>
                            <option value="accepted">Accepted</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_transit">In Transit</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <IconShield className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                    </div>
                </div>

                {/* Priority */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priority
                    </label>
                    <div className="relative">
                        <select
                            value={formData.priority || ''}
                            onChange={(e) => onFormChange('priority', e.target.value)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        >
                            <option value="standard">Standard</option>
                            <option value="express">Express</option>
                            <option value="same_day">Same Day</option>
                            <option value="scheduled">Scheduled</option>
                        </select>
                    </div>
                </div>

                {/* Service Level */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Service Level
                    </label>
                    <div className="relative">
                        <select
                            value={formData.service_level || ''}
                            onChange={(e) => onFormChange('service_level', e.target.value)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        >
                            <option value="standard">Standard (2-3 business days)</option>
                            <option value="express">Express (1-2 business days)</option>
                            <option value="same_day">Same Day Delivery</option>
                            <option value="scheduled">Scheduled (Flexible Date)</option>
                        </select>
                    </div>
                </div>

                {/* Service Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Service Type
                    </label>
                    <div className="relative">
                        <select
                            value={formData.service_id || formData.service?.id || ''}
                            onChange={(e) => {
                                const selectedServiceId = e.target.value;
                                const selectedService = services.find(s => s.id === selectedServiceId);
                                onFormChange('service_id', selectedServiceId);
                                if (selectedService) {
                                    onFormChange('service_type', selectedService.name);
                                }
                            }}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        >
                            <option value="">Select Service Type</option>
                            {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                    {service.name}
                                </option>
                            ))}
                        </select>
                        <IconTruck className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                    </div>
                </div>

                {/* Tracking Number */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tracking Number
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={formData.tracking_number || ''}
                            readOnly
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                            placeholder="Auto-generated tracking number"
                        />
                        <IconTag className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        This tracking number is automatically generated and cannot be edited.
                    </p>
                </div>
            </div>

            {/* Contact Information */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Contact Name
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.contact_name || ''}
                                onChange={(e) => onFormChange('contact_name', e.target.value)}
                                disabled={!isEditing}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                placeholder="Full name"
                            />
                            <IconUser className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Contact Email
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                value={formData.contact_email || ''}
                                onChange={(e) => onFormChange('contact_email', e.target.value)}
                                disabled={!isEditing}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                placeholder="email@example.com"
                            />
                            <IconMail className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Contact Phone
                        </label>
                        <div className="relative">
                            <input
                                type="tel"
                                value={formData.contact_phone || ''}
                                onChange={(e) => onFormChange('contact_phone', e.target.value)}
                                disabled={!isEditing}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                placeholder="+44 123 456 7890"
                            />
                            <IconPhone className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            

            {/* Special Instructions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Special Instructions</h4>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Special Instructions
                    </label>
                    <textarea
                        value={formData.special_instructions || ''}
                        onChange={(e) => onFormChange('special_instructions', e.target.value)}
                        disabled={!isEditing}
                        rows={4}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        placeholder="Any special instructions or requirements for this request..."
                    />
                </div>
            </div>
        </div>
    );
};

export default RequestBasicInfoTab;
