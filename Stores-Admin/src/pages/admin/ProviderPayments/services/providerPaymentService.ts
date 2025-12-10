import axiosInstance from "../../../../services/axiosInstance";

const providerPaymentService = {
    // Get all provider payments
    getPayments: async (params?: {
        provider_id?: string;
        job_id?: string;
        status?: string;
        payment_type?: string;
        has_job?: boolean;
    }) => {
        const queryParams = new URLSearchParams();
        if (params?.provider_id) queryParams.append('provider_id', params.provider_id);
        if (params?.job_id) queryParams.append('job_id', params.job_id);
        if (params?.status) queryParams.append('status', params.status);
        if (params?.payment_type) queryParams.append('payment_type', params.payment_type);
        if (params?.has_job !== undefined) queryParams.append('has_job', String(params.has_job));
        
        const queryString = queryParams.toString();
        const url = queryString ? `/provider-payments/?${queryString}` : '/provider-payments/';
        const response = await axiosInstance.get(url);
        return response.data;
    },

    // Get payment summary
    getSummary: async () => {
        const response = await axiosInstance.get('/provider-payments/summary/');
        return response.data;
    },

    // Create a new payment
    createPayment: async (data: {
        provider: string;
        job?: string | null;
        amount: string;
        payment_type: 'payout' | 'refund' | 'fee';
        status?: 'pending' | 'completed' | 'failed';
        transaction_id?: string;
        notes?: string;
    }) => {
        const response = await axiosInstance.post('/provider-payments/', data);
        return response.data;
    },

    // Update a payment
    updatePayment: async (paymentId: string, data: {
        provider?: string;
        job?: string | null;
        amount?: string;
        payment_type?: 'payout' | 'refund' | 'fee';
        status?: 'pending' | 'completed' | 'failed';
        transaction_id?: string;
        notes?: string;
    }) => {
        const response = await axiosInstance.patch(`/provider-payments/${paymentId}/`, data);
        return response.data;
    },

    // Get a single payment
    getPayment: async (paymentId: string) => {
        const response = await axiosInstance.get(`/provider-payments/${paymentId}/`);
        return response.data;
    },

    // Delete a payment
    deletePayment: async (paymentId: string) => {
        const response = await axiosInstance.delete(`/provider-payments/${paymentId}/`);
        return response.data;
    },

    // Create payments for all completed jobs
    createPaymentsForCompletedJobs: async () => {
        const response = await axiosInstance.post('/provider-payments/create_payments_for_completed_jobs/');
        return response.data;
    },

    // Initiate payment processing (calls third-party service)
    initiatePayment: async (paymentId: string) => {
        const response = await axiosInstance.post(`/provider-payments/${paymentId}/initiate_payment/`);
        return response.data;
    },
};

export default providerPaymentService;

