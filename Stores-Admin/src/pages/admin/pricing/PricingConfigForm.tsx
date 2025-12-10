import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { createPricingConfiguration, updatePricingConfiguration } from '../../../services/pricingService';

interface PricingConfigFormProps {
    initialData?: {
        id?: number;
        name: string;
        is_active: boolean;
        base_price: number;
        min_price: number;
        max_price_multiplier: number;
        fuel_surcharge_percentage: number;
        carbon_offset_rate: number;
    };
    onClose: () => void;
    onSuccess: () => void;
}

const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    base_price: Yup.number().required('Base price is required').min(0.01, 'Base price must be greater than 0'),
    min_price: Yup.number().required('Minimum price is required').min(0.01, 'Minimum price must be greater than 0'),
    max_price_multiplier: Yup.number().required('Maximum price multiplier is required').min(1, 'Maximum price multiplier must be at least 1'),
    fuel_surcharge_percentage: Yup.number()
        .required('Fuel surcharge percentage is required')
        .min(0, 'Fuel surcharge percentage cannot be negative')
        .max(100, 'Fuel surcharge percentage cannot exceed 100'),
    carbon_offset_rate: Yup.number().required('Carbon offset rate is required').min(0, 'Carbon offset rate cannot be negative'),
});

const PricingConfigForm: React.FC<PricingConfigFormProps> = ({ initialData, onClose, onSuccess }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formik = useFormik({
        initialValues: {
            name: initialData?.name || '',
            is_active: initialData?.is_active ?? true,
            base_price: initialData?.base_price || 50.0,
            min_price: initialData?.min_price || 30.0,
            max_price_multiplier: initialData?.max_price_multiplier || 5.0,
            fuel_surcharge_percentage: initialData?.fuel_surcharge_percentage || 0.0,
            carbon_offset_rate: initialData?.carbon_offset_rate || 0.0,
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                setIsSubmitting(true);
                setError(null);

                if (initialData?.id) {
                    await updatePricingConfiguration(initialData.id, values);
                } else {
                    await createPricingConfiguration(values);
                }

                onSuccess();
                onClose();
            } catch (err) {
                setError('Failed to save configuration');
                console.error(err);
            } finally {
                setIsSubmitting(false);
            }
        },
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">{initialData?.id ? 'Edit' : 'Add'} Pricing Configuration</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                </div>

                {error && <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">{error}</div>}

                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        {formik.touched.name && formik.errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formik.errors.name}</p>}
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="is_active"
                            checked={formik.values.is_active}
                            onChange={formik.handleChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Active</label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Price ($)</label>
                            <input
                                type="number"
                                name="base_price"
                                step="0.01"
                                value={formik.values.base_price}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {formik.touched.base_price && formik.errors.base_price && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formik.errors.base_price}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Price ($)</label>
                            <input
                                type="number"
                                name="min_price"
                                step="0.01"
                                value={formik.values.min_price}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {formik.touched.min_price && formik.errors.min_price && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formik.errors.min_price}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maximum Price Multiplier</label>
                            <input
                                type="number"
                                name="max_price_multiplier"
                                step="0.1"
                                value={formik.values.max_price_multiplier}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {formik.touched.max_price_multiplier && formik.errors.max_price_multiplier && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formik.errors.max_price_multiplier}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fuel Surcharge (%)</label>
                            <input
                                type="number"
                                name="fuel_surcharge_percentage"
                                step="0.01"
                                value={formik.values.fuel_surcharge_percentage}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {formik.touched.fuel_surcharge_percentage && formik.errors.fuel_surcharge_percentage && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formik.errors.fuel_surcharge_percentage}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carbon Offset Rate ($)</label>
                            <input
                                type="number"
                                name="carbon_offset_rate"
                                step="0.01"
                                value={formik.values.carbon_offset_rate}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {formik.touched.carbon_offset_rate && formik.errors.carbon_offset_rate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formik.errors.carbon_offset_rate}</p>}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : initialData?.id ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PricingConfigForm;
