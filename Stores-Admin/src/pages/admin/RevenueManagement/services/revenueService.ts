import axiosInstance from '../../../../services/axiosInstance';

export interface OverrideStatusPayload {
    payment_id: string;
    new_status: string;
    admin_notes?: string;
}

export interface CheckoutSessionRequestPayload {
    request_id: string;
    amount: number;
    currency: string;
    success_url: string;
    cancel_url: string;
    description?: string;
}

class RevenueService {
    async reconcilePayments(): Promise<void> {
        await axiosInstance.post('requests/reconcile_statuses/');
    }

    async createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<any> {
        const response = await axiosInstance.post('/payments/create_refund/', {
            payment_intent_id: paymentIntentId,
            amount,
            reason,
        });
        return response.data;
    }

    async overrideStatus(payload: OverrideStatusPayload): Promise<any> {
        console.log('the payload is', payload);
        const response = await axiosInstance.patch('/payments/override_status/', payload);
        return response.data;
    }

    async createCheckoutSession(payload: CheckoutSessionRequestPayload): Promise<{ id: string; url: string }> {
        const response = await axiosInstance.post('/payments/create_checkout_session/', payload);
        return response.data;
    }

    async pollPayment(paymentId: string): Promise<any> {
        const response = await axiosInstance.post(`/payments/${paymentId}/poll_status/`);
        return response.data;
    }

    async deletePayment(paymentId: string): Promise<void> {
        await axiosInstance.delete(`/payments/${paymentId}/`);
    }
}

const revenueService = new RevenueService();
export default revenueService;


