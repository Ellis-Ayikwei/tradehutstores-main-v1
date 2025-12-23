import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface Provider {
    id: string;
    company_name: string;
}

interface Job {
    id: string;
    job_number: string;
    title: string;
    status: string;
}

interface ProviderPayment {
    id: string;
    provider: string | Provider;
    provider_id?: string;
    provider_company_name?: string;
    job?: string | Job | null;
    job_id?: string;
    job_number?: string;
    job_title?: string;
    transaction_id: string;
    amount: string;
    payment_type: 'payout' | 'refund' | 'fee';
    status: 'pending' | 'completed' | 'failed';
    notes?: string;
    created_at: string;
    completed_at?: string | null;
}

interface UpdatePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: ProviderPayment | null;
    onSubmit: (paymentId: string, data: {
        provider?: string;
        job?: string | null;
        amount?: string;
        payment_type?: 'payout' | 'refund' | 'fee';
        status?: 'pending' | 'completed' | 'failed';
        transaction_id?: string;
        notes?: string;
    }) => Promise<void>;
    providers: Provider[];
    jobs?: Job[];
    formatCurrency: (amount: number) => string;
}

const UpdatePaymentModal: React.FC<UpdatePaymentModalProps> = ({
    isOpen,
    onClose,
    payment,
    onSubmit,
    providers,
    jobs = [],
    formatCurrency,
}) => {
    const [formData, setFormData] = useState({
        provider: '',
        job: '',
        amount: '',
        payment_type: 'payout' as 'payout' | 'refund' | 'fee',
        status: 'pending' as 'pending' | 'completed' | 'failed',
        transaction_id: '',
        notes: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [submitting, setSubmitting] = useState(false);
    const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

    useEffect(() => {
        if (payment) {
            const providerId = typeof payment.provider === 'string' 
                ? payment.provider 
                : payment.provider_id || (payment.provider as Provider)?.id || '';
            const jobId = payment.job 
                ? (typeof payment.job === 'string' ? payment.job : payment.job_id || (payment.job as Job)?.id || '')
                : '';

            setFormData({
                provider: providerId,
                job: jobId,
                amount: payment.amount,
                payment_type: payment.payment_type,
                status: payment.status,
                transaction_id: payment.transaction_id,
                notes: payment.notes || '',
            });
        }
    }, [payment]);

    useEffect(() => {
        if (formData.provider && jobs.length > 0) {
            const filtered = jobs.filter((job) => job.status === 'completed');
            setFilteredJobs(filtered);
        } else {
            setFilteredJobs([]);
        }
    }, [formData.provider, jobs]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.provider) {
            newErrors.provider = 'Provider is required';
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        }
        if (!formData.payment_type) {
            newErrors.payment_type = 'Payment type is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !payment) return;

        setSubmitting(true);
        try {
            await onSubmit(payment.id, {
                provider: formData.provider,
                job: formData.job || null,
                amount: formData.amount,
                payment_type: formData.payment_type,
                status: formData.status,
                transaction_id: formData.transaction_id || undefined,
                notes: formData.notes || undefined,
            });
            setErrors({});
            onClose();
        } catch (error: any) {
            if (error.response?.data) {
                const apiErrors: { [key: string]: string } = {};
                Object.keys(error.response.data).forEach((key) => {
                    apiErrors[key] = Array.isArray(error.response.data[key])
                        ? error.response.data[key][0]
                        : error.response.data[key];
                });
                setErrors(apiErrors);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !payment) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Update Provider Payment
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Provider Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Provider <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="provider"
                                    value={formData.provider}
                                    onChange={handleChange}
                                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                        errors.provider ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    required
                                >
                                    <option value="">Select a provider</option>
                                    {providers.map((provider) => (
                                        <option key={provider.id} value={provider.id}>
                                            {provider.company_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.provider && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        {errors.provider}
                                    </p>
                                )}
                            </div>

                            {/* Job Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Job (Optional)
                                </label>
                                <select
                                    name="job"
                                    value={formData.job}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={!formData.provider}
                                >
                                    <option value="">No job (standalone payment)</option>
                                    {filteredJobs.map((job) => (
                                        <option key={job.id} value={job.id}>
                                            {job.job_number} - {job.title}
                                        </option>
                                    ))}
                                </select>
                                {errors.job && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        {errors.job}
                                    </p>
                                )}
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Amount <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0.01"
                                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                        errors.amount ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    required
                                />
                                {errors.amount && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        {errors.amount}
                                    </p>
                                )}
                            </div>

                            {/* Payment Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Payment Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="payment_type"
                                    value={formData.payment_type}
                                    onChange={handleChange}
                                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                        errors.payment_type ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    required
                                >
                                    <option value="payout">Payout</option>
                                    <option value="refund">Refund</option>
                                    <option value="fee">Fee</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    required
                                >
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>

                            {/* Transaction ID */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Transaction ID
                                </label>
                                <input
                                    type="text"
                                    name="transaction_id"
                                    value={formData.transaction_id}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Updating...' : 'Update Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatePaymentModal;

