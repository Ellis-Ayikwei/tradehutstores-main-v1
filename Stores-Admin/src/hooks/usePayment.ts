import { useDispatch, useSelector } from 'react-redux';
import { IRootState, AppDispatch } from '../store';
import { fetchPaymentMethods, addPaymentMethod, setDefaultPaymentMethod, fetchPayments, createPayment, PaymentMethod, Payment } from '../store/slices/paymentSlice';
import { ThunkDispatch } from '@reduxjs/toolkit';
import { AnyAction } from 'redux';

export const usePayment = () => {
    const dispatch = useDispatch<ThunkDispatch<IRootState, undefined, AnyAction>>();
    const { paymentMethods, payments, loading, error } = useSelector((state: IRootState) => state.payments);

    const getPaymentMethods = (userId?: string) => {
        dispatch(fetchPaymentMethods(userId));
    };

    const addNewPaymentMethod = (method: Partial<PaymentMethod>) => {
        return dispatch(addPaymentMethod(method));
    };

    const setDefaultMethod = (methodId: string) => {
        return dispatch(setDefaultPaymentMethod(methodId));
    };

    const getPayments = (requestId?: string) => {
        dispatch(fetchPayments(requestId));
    };

    const makePayment = (payment: Partial<Payment>) => {
        return dispatch(createPayment(payment));
    };

    return {
        paymentMethods,
        payments,
        loading,
        error,
        getPaymentMethods,
        addNewPaymentMethod,
        setDefaultMethod,
        getPayments,
        makePayment,
    };
};
