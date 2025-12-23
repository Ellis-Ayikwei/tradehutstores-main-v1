import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { IconX } from '@tabler/icons-react';
import Select from 'react-select';

interface Provider {
    id: string;
    name: string;
    company_name: string;
    email: string;
}

interface Customer {
    id: string;
    user: string;
    user_email: string;
    user_first_name: string;
    user_last_name: string;
    default_pickup_address: any;
    default_delivery_address: any;
    preferred_vehicle_types: any[];
    fragile_items_handling: boolean;
    insurance_preference: string;
    loyalty_points: number;
    referral_code: string;
    communication_preferences: any;
    marketing_opt_in: boolean;
    created_at: string;
    updated_at: string;
}

interface Job {
    id: string;
    title: string;
    status: string;
    request: {
        tracking_number: string;
    };
}

interface Review {
    id: string;
    provider: string;
    provider_name: string;
    customer: string;
    customer_email: string;
    customer_name: string;
    overall_rating: number;
    punctuality_rating: number;
    service_quality_rating: number;
    communication_rating: number;
    professionalism_rating: number;
    value_for_money_rating: number;
    average_detailed_rating: number;
    review_text: string;
    is_verified: boolean;
    is_public: boolean;
    job: string | null;
    request: string | null;
    created_at: string;
    updated_at: string;
}

interface ReviewModalProps {
    isOpen: boolean;
    editingReview: Review | null;
    form: {
        provider: string;
        customer: string;
        overall_rating: string;
        punctuality_rating: string;
        service_quality_rating: string;
        communication_rating: string;
        professionalism_rating: string;
        value_for_money_rating: string;
        review_text: string;
        is_verified: boolean;
        is_public: boolean;
        job: string;
    };
    providers: Provider[];
    customers: Customer[];
    jobs: Job[];
    saving: boolean;
    onClose: () => void;
    onFormChange: (field: string, value: any) => void;
    onSave: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
    isOpen,
    editingReview,
    form,
    providers,
    customers,
    jobs,
    saving,
    onClose,
    onFormChange,
    onSave,
}) => {
    // Custom styles for React Select
    const customSelectStyles = {
        control: (provided: any, state: any) => ({
            ...provided,
            minHeight: '48px',
            borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
            boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
            '&:hover': {
                borderColor: state.isFocused ? '#3b82f6' : '#9ca3af',
            },
        }),
        option: (provided: any, state: any) => ({
            ...provided,
            backgroundColor: state.isSelected 
                ? '#3b82f6' 
                : state.isFocused 
                    ? '#f3f4f6' 
                    : 'white',
            color: state.isSelected ? 'white' : '#374151',
            '&:hover': {
                backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
            },
        }),
        placeholder: (provided: any) => ({
            ...provided,
            color: '#9ca3af',
        }),
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900 dark:text-white">
                                            {editingReview ? 'Edit Review' : 'Add New Review'}
                                        </Dialog.Title>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {editingReview ? 'Update review details and ratings' : 'Create a new customer review for a provider'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        <IconX className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
                                    {/* Basic Information Section */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Provider Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Provider *
                                                </label>
                                                <Select
                                                    value={providers.find(p => p.id === form.provider) ? {
                                                        value: form.provider,
                                                        label: providers.find(p => p.id === form.provider)?.company_name || providers.find(p => p.id === form.provider)?.name || ''
                                                    } : null}
                                                    onChange={(option) => onFormChange('provider', option?.value || '')}
                                                    options={providers.map(provider => ({
                                                        value: provider.id,
                                                        label: provider.company_name || provider.name
                                                    }))}
                                                    placeholder="Select Provider"
                                                    styles={customSelectStyles}
                                                    isClearable
                                                    isSearchable
                                                />
                                            </div>

                                            {/* Customer Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Customer *
                                                </label>
                                                <Select
                                                    value={customers.find(c => c.id === form.customer) ? {
                                                        value: form.customer,
                                                        label: `${customers.find(c => c.id === form.customer)?.user_first_name} ${customers.find(c => c.id === form.customer)?.user_last_name} (${customers.find(c => c.id === form.customer)?.user_email})`
                                                    } : null}
                                                    onChange={(option) => onFormChange('customer', option?.value || '')}
                                                    options={customers.map(customer => ({
                                                        value: customer.id,
                                                        label: `${customer.user_first_name} ${customer.user_last_name} (${customer.user_email})`
                                                    }))}
                                                    placeholder="Select Customer"
                                                    styles={customSelectStyles}
                                                    isClearable
                                                    isSearchable
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rating Section */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Rating Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {/* Overall Rating */}
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Overall Rating *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    step="0.1"
                                                    value={form.overall_rating}
                                                    onChange={(e) => onFormChange('overall_rating', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="1.0 - 5.0"
                                                />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Overall service experience</p>
                                            </div>

                                            {/* Punctuality Rating */}
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Punctuality *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    step="0.1"
                                                    value={form.punctuality_rating}
                                                    onChange={(e) => onFormChange('punctuality_rating', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="1.0 - 5.0"
                                                />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">On-time delivery</p>
                                            </div>

                                            {/* Service Quality Rating */}
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Service Quality *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    step="0.1"
                                                    value={form.service_quality_rating}
                                                    onChange={(e) => onFormChange('service_quality_rating', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="1.0 - 5.0"
                                                />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Quality of service provided</p>
                                            </div>

                                            {/* Communication Rating */}
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Communication *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    step="0.1"
                                                    value={form.communication_rating}
                                                    onChange={(e) => onFormChange('communication_rating', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="1.0 - 5.0"
                                                />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Clear communication</p>
                                            </div>

                                            {/* Professionalism Rating */}
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Professionalism *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    step="0.1"
                                                    value={form.professionalism_rating}
                                                    onChange={(e) => onFormChange('professionalism_rating', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="1.0 - 5.0"
                                                />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Professional behavior</p>
                                            </div>

                                            {/* Value for Money Rating */}
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Value for Money *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    step="0.1"
                                                    value={form.value_for_money_rating}
                                                    onChange={(e) => onFormChange('value_for_money_rating', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="1.0 - 5.0"
                                                />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Price vs quality</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Review Content Section */}
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Review Content</h4>
                                        
                                        {/* Review Text */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Review Text
                                            </label>
                                            <textarea
                                                value={form.review_text}
                                                onChange={(e) => onFormChange('review_text', e.target.value)}
                                                rows={5}
                                                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                                                placeholder="Share your detailed experience with this provider..."
                                            />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {form.review_text.length}/1000 characters
                                            </p>
                                        </div>

                                        {/* Additional Fields */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Related Job
                                            </label>
                                            <Select
                                                value={jobs.find(j => j.id === form.job) ? {
                                                    value: form.job,
                                                    label: `${jobs.find(j => j.id === form.job)?.title} (${jobs.find(j => j.id === form.job)?.id})`
                                                } : null}
                                                onChange={(option) => onFormChange('job', option?.value || '')}
                                                options={jobs.map(job => ({
                                                    value: job.id,
                                                    label: `${job.title} (${job.id}) - ${job.request?.tracking_number}`
                                                }))}
                                                placeholder="Select Job (Optional)"
                                                styles={customSelectStyles}
                                                isClearable
                                                isSearchable
                                            />
                                        </div>
                                    </div>

                                    {/* Review Settings Section */}
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Review Settings</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    id="verified"
                                                    checked={form.is_verified}
                                                    onChange={(e) => onFormChange('is_verified', e.target.checked)}
                                                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <div>
                                                    <label htmlFor="verified" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Verified Review
                                                    </label>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Mark this review as verified by admin
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    id="public"
                                                    checked={form.is_public}
                                                    onChange={(e) => onFormChange('is_public', e.target.checked)}
                                                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <div>
                                                    <label htmlFor="public" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Public Review
                                                    </label>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Make this review visible to other users
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {editingReview ? 'Updating existing review' : 'Creating new review'}
                                    </div>
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={onClose}
                                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={onSave}
                                            disabled={saving || !form.provider || !form.customer}
                                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
                                        >
                                            {saving ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                    {editingReview ? 'Updating...' : 'Creating...'}
                                                </>
                                            ) : (
                                                <>
                                                    {editingReview ? 'Update Review' : 'Create Review'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ReviewModal;
