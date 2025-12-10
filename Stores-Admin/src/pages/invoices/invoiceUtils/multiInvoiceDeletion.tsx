import { AnyAction, Dispatch } from '@reduxjs/toolkit';
import axiosInstance from '../../../services/axiosInstance';
import confirmDialog from '../../../helper/confirmDialog';
import showMessage from '../../../helper/showMessage';
import { GetInvoicesData } from '../../../store/invoicesSlice';

const handleInvoiceDeletion = async (selectedInvoices: { id: string }[], dispatch: Dispatch<AnyAction>, setSelectedrecords: any): Promise<boolean> => {
    const isConfirmed = await confirmDialog({
        title: 'Delete invoice(s)',
        body: ' This cannot be undone',
        finalQuestion: 'Are you sure you want to delete this invoice(s)?',
    });
    if (!isConfirmed) {
        return false;
    }

    const promises = selectedInvoices.map((invoice) => {
        return axiosInstance.delete(`/invoices/${invoice.id}`);
    });

    const results = await Promise.allSettled(promises);

    const failedDeletes = results.filter((result) => result.status === 'rejected');
    if (failedDeletes.length > 0) {
        console.error('Failed to delete invoice(s):', failedDeletes);
    }

    if (results.every((result) => result.status === 'fulfilled')) {
        showMessage('Invoice(s) have been deleted successfully');
    }

    dispatch(GetInvoicesData() as any);
    setSelectedrecords([]);
    return true;
};

export default handleInvoiceDeletion;
