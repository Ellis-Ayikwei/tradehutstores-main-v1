import { AnyAction, Dispatch } from '@reduxjs/toolkit';
import axiosInstance from '../../../services/axiosInstance';
import { GetPaymentsData } from '../../../store/paymentsSlice';

const handleMultiPaymentCompletion = async (selectedPayments: { id: string }[], dispatch: Dispatch<AnyAction>): Promise<boolean> => {
    const promises = selectedPayments.map((payment) =>
        axiosInstance.put(`/payments/${payment.id}`, {
            status: 'COMPLETED',
        })
    );

    await Promise.all(promises);

    dispatch(GetPaymentsData() as any);

    return true;
};

export default handleMultiPaymentCompletion;
