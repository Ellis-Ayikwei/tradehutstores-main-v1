import { Booking } from '../types/booking';
import api from './api';

export const getBooking = async (id: string): Promise<Booking> => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
};

export const confirmBooking = async (id: string): Promise<Booking> => {
    const response = await api.post(`/bookings/${id}/confirm`);
    return response.data;
};

export const cancelBooking = async (id: string): Promise<Booking> => {
    const response = await api.post(`/bookings/${id}/cancel`);
    return response.data;
};

export const deleteBooking = async (id: string): Promise<void> => {
    await api.delete(`/bookings/${id}`);
};
