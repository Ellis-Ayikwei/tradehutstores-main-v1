import axiosInstance from './axiosInstance';
import fetcher from './fetcher';

export interface StripeConfig {
    publishable_key: string;
    currency: string;
    supported_currencies: string[];
    success_url: string;
    cancel_url: string;
}

export interface CheckoutSessionRequest {
    request_id: string;
    amount: number;
    currency: string;
    success_url: string;
    cancel_url: string;
    description?: string;
}

export interface CheckoutSessionResponse {
    id: string;
    url: string;
    status: string;
    amount: number;
    currency: string;
}

export interface SessionStatus {
    id: string;
    status: string;
    payment_status: string;
    amount_total: number;
    currency: string;
    customer_email: string;
    metadata: {
        user_id: string;
        request_id: string;
        platform: string;
    };
    payment_intent: string;
}

export interface Payment {
    id: string;
    request: string;
    user: string;
    amount: number | string;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' | 'processing';
    payment_type: string;
    transaction_id?: string;
    description: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    stripe_payment_intent_id?: string;
    stripe_customer_id?: string;
    receipt_url?: string;
    notes?: string;
}

class PaymentService {
    /**
     * Get Stripe configuration from backend
     */
    async getStripeConfig(): Promise<StripeConfig> {
        try {
            const response = await axiosInstance.get('/config/');
            return response.data;
        } catch (error) {
            console.error('Error fetching Stripe config:', error);
            throw new Error('Failed to load payment configuration');
        }
    }

    /**
     * Create a Stripe Checkout session
     */
    async createCheckoutSession(data: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
        try {
            console.log('data', data);
            const response = await axiosInstance.post('/payments/create_checkout_session/', data);
            return response.data;
        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw new Error('Failed to create payment session');
        }
    }

    /**
     * Check the status of a checkout session
     */
    async checkSessionStatus(sessionId: string): Promise<SessionStatus> {
        try {
            const response = await axiosInstance.get(`/payments/check_session_status/?session_id=${sessionId}`);
            return response.data;
        } catch (error) {
            console.error('Error checking session status:', error);
            throw new Error('Failed to verify payment status');
        }
    }

    /**
     * Get payments for a specific request
     */
    async getPaymentsForRequest(requestId: string): Promise<Payment[]> {
        try {
            const response = await axiosInstance.get(`/payments/?request=${requestId}`);
            return response.data.results || response.data;
        } catch (error) {
            console.error('Error fetching payments:', error);
            throw new Error('Failed to load payment history');
        }
    }

    /**
     * Create a refund
     */
    async createRefund(paymentIntentId: string, amount?: number, reason?: string) {
        try {
            const response = await axiosInstance.post('/payments/create_refund/', {
                payment_intent_id: paymentIntentId,
                amount,
                reason,
            });
            return response.data;
        } catch (error) {
            console.error('Error creating refund:', error);
            throw new Error('Failed to process refund');
        }
    }

    /**
     * Format currency amount for display
     */
    formatAmount(amount: number, currency: string): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 2,
        }).format(amount);
    }

    /**
     * Get payment status color for UI
     */
    getPaymentStatusColor(status: string): string {
        switch (status) {
            case 'completed':
                return 'text-green-600 bg-green-100';
            case 'pending':
                return 'text-yellow-600 bg-yellow-100';
            case 'failed':
                return 'text-red-600 bg-red-100';
            case 'refunded':
                return 'text-gray-600 bg-gray-100';
            case 'partially_refunded':
                return 'text-orange-600 bg-orange-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    }

    /**
     * Format payment status for display
     */
    formatPaymentStatus(status: string): string {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'pending':
                return 'Pending';
            case 'failed':
                return 'Failed';
            case 'refunded':
                return 'Refunded';
            case 'partially_refunded':
                return 'Partially Refunded';
            case 'processing':
                return 'Processing';
            default:
                return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
        }
    }

    /**
     * Download invoice for a payment
     */
    async downloadInvoice(paymentId: string): Promise<void> {
        try {
            const response = await axiosInstance.get(`/payments/${paymentId}/invoice/`, {
                responseType: 'blob', // Important for file downloads
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Get filename from response header or use default
            const contentDisposition = response.headers['content-disposition'];
            let filename = `invoice-${paymentId}.pdf`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading invoice:', error);
            throw new Error('Failed to download invoice. Please try again.');
        }
    }

    /**
     * Download receipt for a payment
     */
    async downloadReceipt(paymentId: string): Promise<void> {
        try {
            const response = await axiosInstance.get(`/payments/${paymentId}/receipt/`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers['content-disposition'];
            let filename = `receipt-${paymentId}.pdf`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading receipt:', error);
            throw new Error('Failed to download receipt. Please try again.');
        }
    }

    /**
     * Get invoice URL for preview (if available)
     */
    async getInvoiceUrl(paymentId: string): Promise<string> {
        try {
            const response = await axiosInstance.get(`/payments/${paymentId}/invoice-url/`);
            return response.data.url;
        } catch (error) {
            console.error('Error getting invoice URL:', error);
            throw new Error('Failed to get invoice URL');
        }
    }
}

export const paymentService = new PaymentService();
export default paymentService;
