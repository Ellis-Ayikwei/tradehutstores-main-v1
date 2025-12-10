import React from 'react';
import axiosInstance from '../../../../services/axiosInstance';
import showMessage from '../../../../helper/showMessage';
import showRequestError from '../../../../helper/showRequestError';
import { IconCurrencyPound, IconCalculator, IconRefresh, IconAlertCircle } from '@tabler/icons-react';

interface RequestPricingTabProps {
    formData: any;
    isEditing: boolean;
    onFormChange: (field: string, value: any) => void;
    onGetNewPrices: () => void;
    saving: boolean;
    hasChanges?: boolean;
    onSaveTab?: () => void;
    onCancelTab?: () => void;
    requestId?: string;
    onRefetch?: () => void;
    setIsEditing?: (v: boolean) => void;
}

const RequestPricingTab: React.FC<RequestPricingTabProps> = ({
    formData,
    isEditing,
    onFormChange,
    onGetNewPrices,
    saving,
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
                service_level: formData.service_level,
                service_type: formData.service_type,
                insurance_required: formData.insurance_required,
                insurance_value: formData.insurance_value,
                loading_time: formData.loading_time,
                unloading_time: formData.unloading_time,
            };
            await axiosInstance.patch(`/instant-requests/${requestId}/update-pricing/`, payload);
            showMessage('Pricing updated');
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Pricing & Costs</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Manage pricing information and request new price calculations.
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

            {/* Current Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white">Base Price</h4>
                        <IconCurrencyPound className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-center">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            £{formData.base_price || 0}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Initial calculated price
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white">Final Price</h4>
                        <IconCalculator className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-center">
                        <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                            £{formData.final_price || formData.base_price || 0}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Final agreed price
                    </p>
                </div>
            </div>

            {/* Price Factors */}
            {formData.price_factors && Object.keys(formData.price_factors).length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Price Factors</h4>
                    <div className="space-y-3">
                        {Object.entries(formData.price_factors).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                    {key.replace(/_/g, ' ')}
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {typeof value === 'number' ? `£${value}` : value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Price Breakdown */}
            {formData.price_breakdown && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Price Breakdown</h4>
                    <div className="space-y-3">
                        {Object.entries(formData.price_breakdown).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                    {key.replace(/_/g, ' ')}
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {typeof value === 'number' ? `£${value.toFixed(2)}` : value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manual Price Override */}
            {isEditing && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Manual Price Override</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Base Price Override
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500">£</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.base_price || ''}
                                    onChange={(e) => onFormChange('base_price', parseFloat(e.target.value) || 0)}
                                    className="w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Final Price Override
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500">£</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.final_price || ''}
                                    onChange={(e) => onFormChange('final_price', parseFloat(e.target.value) || 0)}
                                    className="w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Get New Prices */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <div className="flex items-start">
                    <IconAlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                        <h4 className="text-md font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Request New Price Calculation
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                            Get updated pricing based on current items, locations, and requirements. This will open a price forecast modal where you can select from different pricing options and staff configurations.
                        </p>
                        <button
                            onClick={onGetNewPrices}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <IconRefresh className="w-4 h-4" />
                            )}
                            {saving ? 'Calculating...' : 'Get New Prices'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Payment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Payment Status
                        </label>
                        <select
                            value={formData.payment_status || 'pending'}
                            onChange={(e) => onFormChange('payment_status', e.target.value)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Insurance Required
                        </label>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="insurance_required"
                                checked={formData.insurance_required || false}
                                onChange={(e) => onFormChange('insurance_required', e.target.checked)}
                                disabled={!isEditing}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:cursor-not-allowed"
                            />
                            <label htmlFor="insurance_required" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                Insurance required for this request
                            </label>
                        </div>
                    </div>
                </div>
                {formData.insurance_required && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Insurance Value
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">£</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.insurance_value || ''}
                                onChange={(e) => onFormChange('insurance_value', parseFloat(e.target.value) || 0)}
                                disabled={!isEditing}
                                className="w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestPricingTab;




