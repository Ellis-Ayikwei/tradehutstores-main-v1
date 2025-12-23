import { AnyAction, Dispatch } from '@reduxjs/toolkit';
import axiosInstance from '../../../services/axiosInstance';
import { GetInvoicesData } from '../../../store/invoicesSlice';

const handleBulkInvoiceEmail = async (selectedInvoices: { id: string }[], dispatch: Dispatch<AnyAction>): Promise<boolean> => {
    const promises = selectedInvoices.map((invoice) => axiosInstance.post(`/send_invoice/${invoice.id}`));

    await Promise.all(promises);

    dispatch(GetInvoicesData() as any);
    return true;
};

export default handleBulkInvoiceEmail;
