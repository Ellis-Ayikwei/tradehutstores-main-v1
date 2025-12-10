import { AnyAction, Dispatch } from '@reduxjs/toolkit';
import axiosInstance from '../../../services/axiosInstance';
import showMessage from '../../../helper/showMessage';
import { GetInvoicesData } from '../../../store/invoicesSlice';

const handleMultiInvoiceCancellation = async (selectedInvoices: { id: string }[], dispatch: Dispatch<AnyAction>): Promise<boolean> => {
    const promises = selectedInvoices.map((inv) =>
        axiosInstance.put(`/invoices/${inv.id}`, {
            status: 'CANCELLED',
        })
    );

    const results = await Promise.allSettled(promises);

    dispatch(GetInvoicesData() as any);

    if (results.every((result) => result.status === 'fulfilled')) {
        showMessage('Invoices have been Cancelled successfully');
    }

    return true;
};

export default handleMultiInvoiceCancellation;
