import React from 'react';
import axiosInstance from '../../../../services/axiosInstance';
import showMessage from '../../../../helper/showMessage';
import showRequestError from '../../../../helper/showRequestError';
import { IconFileText, IconWeight, IconRuler, IconPhoto, IconShield } from '@tabler/icons-react';

interface RequestAdditionalTabProps {
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

const RequestAdditionalTab: React.FC<RequestAdditionalTabProps> = ({
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
            await axiosInstance.patch(`/instant-requests/${requestId}/update-additional/`, {
                special_instructions: formData.special_instructions,
                items_description: formData.items_description,
                total_weight: formData.total_weight,
                dimensions: formData.dimensions,
                requires_special_handling: formData.requires_special_handling,
            });
            showMessage('Additional info updated');
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Additional Information</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Additional details, measurements, and special requirements for this request.
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

            {/* Items Description */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconFileText className="w-5 h-5 text-gray-400" />
                    Items Description
                </h4>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                    </label>
                    <textarea
                        value={formData.items_description || ''}
                        onChange={(e) => onFormChange('items_description', e.target.value)}
                        disabled={!isEditing}
                        rows={4}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        placeholder="Describe the items to be moved..."
                    />
                </div>
            </div>

            {/* Weight and Dimensions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <IconWeight className="w-5 h-5 text-gray-400" />
                        Weight Information
                    </h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Total Weight (kg)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={formData.total_weight || ''}
                            onChange={(e) => onFormChange('total_weight', parseFloat(e.target.value) || 0)}
                            disabled={!isEditing}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                            placeholder="0.0"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <IconRuler className="w-5 h-5 text-gray-400" />
                        Dimensions
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Length (cm)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={formData.dimensions?.length || ''}
                                onChange={(e) => onFormChange('dimensions', {
                                    ...formData.dimensions,
                                    length: parseFloat(e.target.value) || 0
                                })}
                                disabled={!isEditing}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                placeholder="0.0"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Width (cm)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={formData.dimensions?.width || ''}
                                    onChange={(e) => onFormChange('dimensions', {
                                        ...formData.dimensions,
                                        width: parseFloat(e.target.value) || 0
                                    })}
                                    disabled={!isEditing}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                    placeholder="0.0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Height (cm)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={formData.dimensions?.height || ''}
                                    onChange={(e) => onFormChange('dimensions', {
                                        ...formData.dimensions,
                                        height: parseFloat(e.target.value) || 0
                                    })}
                                    disabled={!isEditing}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                    placeholder="0.0"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Special Handling */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconShield className="w-5 h-5 text-gray-400" />
                    Special Handling Requirements
                </h4>
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="requires_special_handling"
                            checked={formData.requires_special_handling || false}
                            onChange={(e) => onFormChange('requires_special_handling', e.target.checked)}
                            disabled={!isEditing}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:cursor-not-allowed"
                        />
                        <label htmlFor="requires_special_handling" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Requires special handling
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Special Instructions
                        </label>
                        <textarea
                            value={formData.special_instructions || ''}
                            onChange={(e) => onFormChange('special_instructions', e.target.value)}
                            disabled={!isEditing}
                            rows={3}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                            placeholder="Any special handling instructions..."
                        />
                    </div>
                </div>
            </div>

            {/* Photos */}
            {formData.photo_urls && formData.photo_urls.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <IconPhoto className="w-5 h-5 text-gray-400" />
                        Photos ({formData.photo_urls.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {formData.photo_urls.map((url: string, index: number) => (
                            <div key={index} className="relative">
                                <img
                                    src={url}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Meta Data */}
            {formData.meta_data && Object.keys(formData.meta_data).length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Meta Data</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {JSON.stringify(formData.meta_data, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestAdditionalTab;




