import React from 'react';
import axiosInstance from '../../../../services/axiosInstance';
import showMessage from '../../../../helper/showMessage';
import showRequestError from '../../../../helper/showRequestError';
import { IconCalendar, IconClock, IconSettings } from '@tabler/icons-react';

interface RequestTimingTabProps {
    formData: any;
    isEditing: boolean;
    onFormChange: (field: string, value: any) => void;
    saving?: boolean;
    hasChanges?: boolean;
    onSaveTab?: () => void;
    onCancelTab?: () => void;
    requestId?: string;
    onRefetch?: () => void;
    setIsEditing?: (v: boolean) => void;
}

const RequestTimingTab: React.FC<RequestTimingTabProps> = ({
    formData,
    isEditing,
    onFormChange,
    saving = false,
    hasChanges = false,
    onSaveTab = () => {},
    onCancelTab = () => {},
    requestId,
    onRefetch = () => {},
    setIsEditing = () => {}
}) => {
    const handleSave = async () => {
        if (!requestId) return;
        try {
            const payload = {
                preferred_pickup_date: formData.preferred_pickup_date,
                preferred_pickup_time: formData.preferred_pickup_time,
                preferred_pickup_time_window: formData.preferred_pickup_time_window,
                preferred_delivery_date: formData.preferred_delivery_date,
                preferred_delivery_time: formData.preferred_delivery_time,
                is_flexible: formData.is_flexible,
                staff_required: formData.staff_required,
            };
            await axiosInstance.patch(`/instant-requests/${requestId}/update-timing/`, payload);
            showMessage('Timing updated');
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Timing & Schedule</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Configure the timing preferences and schedule for this request.
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

            {!isEditing && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                        💡 Click the "Edit" button above to enable editing of timing preferences.
                    </p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pickup Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Pickup Date
                    </label>
                    <div className="relative">
                        <input
                            type="date"
                            value={(() => {
                                if (!formData.preferred_pickup_date) return '';
                                const dateStr = typeof formData.preferred_pickup_date === 'string' 
                                    ? formData.preferred_pickup_date 
                                    : formData.preferred_pickup_date.toString();
                                // Handle ISO date format or already formatted date
                                if (dateStr.includes('T')) {
                                    return dateStr.split('T')[0];
                                }
                                return dateStr.split(' ')[0]; // Handle space-separated dates
                            })()}
                            onChange={(e) => onFormChange('preferred_pickup_date', e.target.value)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        />
                        <IconCalendar className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Pickup Time */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Pickup Time
                    </label>
                    <div className="relative">
                        <select
                            value={formData.preferred_pickup_time || ''}
                            onChange={(e) => onFormChange('preferred_pickup_time', e.target.value)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        >
                            <option value="">Select Time Slot</option>
                            <option value="morning">Morning (8AM - 12PM)</option>
                            <option value="afternoon">Afternoon (12PM - 4PM)</option>
                            <option value="evening">Evening (4PM - 8PM)</option>
                            <option value="flexible">Flexible (Any time)</option>
                        </select>
                        <IconClock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                    </div>
                </div>

                {/* Delivery Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Delivery Date
                    </label>
                    <div className="relative">
                        <input
                            type="date"
                            value={(() => {
                                if (!formData.preferred_delivery_date) return '';
                                const dateStr = typeof formData.preferred_delivery_date === 'string' 
                                    ? formData.preferred_delivery_date 
                                    : formData.preferred_delivery_date.toString();
                                // Handle ISO date format or already formatted date
                                if (dateStr.includes('T')) {
                                    return dateStr.split('T')[0];
                                }
                                return dateStr.split(' ')[0]; // Handle space-separated dates
                            })()}
                            onChange={(e) => onFormChange('preferred_delivery_date', e.target.value)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        />
                        <IconCalendar className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Delivery Time */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Delivery Time
                    </label>
                    <div className="relative">
                        <select
                            value={formData.preferred_delivery_time || ''}
                            onChange={(e) => onFormChange('preferred_delivery_time', e.target.value)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        >
                            <option value="">Select Time Slot</option>
                            <option value="morning">Morning (8AM - 12PM)</option>
                            <option value="afternoon">Afternoon (12PM - 4PM)</option>
                            <option value="evening">Evening (4PM - 8PM)</option>
                            <option value="flexible">Flexible (Any time)</option>
                        </select>
                        <IconClock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Flexible Schedule */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Schedule Flexibility</h4>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="is_flexible"
                        checked={formData.is_flexible || false}
                        onChange={(e) => onFormChange('is_flexible', e.target.checked)}
                        disabled={!isEditing}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="is_flexible" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Schedule is flexible - can accommodate alternative dates/times
                    </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    When enabled, the system can suggest alternative scheduling options if the preferred times are not available.
                </p>
            </div>

            {/* Staff Requirements */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Staff Requirements</h4>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Number of Staff Required
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.staff_required || 1}
                            onChange={(e) => onFormChange('staff_required', parseInt(e.target.value) || 1)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        />
                        <IconSettings className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Number of staff members required for this request (1-10).
                    </p>
                </div>
            </div>

            {/* Route Information - Estimated Duration */}
            {formData.estimated_duration && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <IconClock className="w-5 h-5 text-gray-400" />
                        Route Information
                    </h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Estimated Duration
                        </label>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formData.estimated_duration}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Estimated travel time based on the route distance and traffic conditions
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Time Window */}
            {formData.preferred_pickup_time_window && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Custom Time Window</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Custom time window: {JSON.stringify(formData.preferred_pickup_time_window)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestTimingTab;




