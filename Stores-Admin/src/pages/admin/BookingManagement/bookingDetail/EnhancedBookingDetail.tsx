import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useSWR from 'swr';
import axiosInstance from '../../../../services/axiosInstance';
import showRequestError from '../../../../helper/showRequestError';

// Import subcomponents
import BookingDetailHeader from './BookingDetailHeader';
import BookingOverviewTab from './BookingOverviewTab';
import BookingFinancialTab from './BookingFinancialTab';
import BookingOperationsTab from './BookingOperationsTab';
import {
    StatusOverrideModal,
    PriceAdjustmentModal,
    RefundModal,
    DriverAssignmentModal,
    ConfirmJobModal,
} from './BookingModals';

// Create a fetcher function that uses axiosInstance
const fetcher = async (url: string) => {
    const response = await axiosInstance.get(url);
    return response.data;
};

const EnhancedBookingDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'operations'>('overview');

    // Admin-specific states
    const [showPriceAdjustment, setShowPriceAdjustment] = useState(false);
    const [showDriverAssignment, setShowDriverAssignment] = useState(false);
    const [showStatusOverride, setShowStatusOverride] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showConfirmJobModal, setShowConfirmJobModal] = useState(false);
    const [newAdminNote, setNewAdminNote] = useState('');

    // Loading states for admin functions
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const [isPriceAdjusting, setIsPriceAdjusting] = useState(false);
    const [isDriverAssigning, setIsDriverAssigning] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [isConfirmingJob, setIsConfirmingJob] = useState(false);

    const { data: bookingData, error, mutate } = useSWR(id ? `/requests/${id}/` : null, fetcher);
    console.log('the request data', bookingData);

    useEffect(() => {
        if (bookingData) {
            setBooking(bookingData);
            setLoading(false);
        }
    }, [bookingData]);

    // Admin Functions
    const handleStatusOverride = async (newStatus: string, reason: string) => {
        setIsStatusUpdating(true);
        try {
            await axiosInstance.post(`/admin/bookings/${id}/status/`, {
                status: newStatus,
                reason,
                admin_override: true,
            });
            mutate();
            setShowStatusOverride(false);
        } catch (error) {
            console.error('Status override failed:', error);
        } finally {
            setIsStatusUpdating(false);
        }
    };

    const handlePriceAdjustment = async (adjustmentData: any) => {
        setIsPriceAdjusting(true);
        try {
            await axiosInstance.post(`/requests/${id}/adjust_price/`, adjustmentData);
            mutate();
            setShowPriceAdjustment(false);
        } catch (error) {
            console.error('Price adjustment failed:', error);
        } finally {
            setIsPriceAdjusting(false);
        }
    };

    const handleDriverAssignment = async (driverId: string, notes?: string) => {
        setIsDriverAssigning(true);
        try {
            await axiosInstance.post(`/admin/bookings/${id}/assign/`, {
                driver_id: driverId,
                admin_notes: notes,
            });
            mutate();
            setShowDriverAssignment(false);
        } catch (error) {
            console.error('Driver assignment failed:', error);
        } finally {
            setIsDriverAssigning(false);
        }
    };

    const handleRefund = async (refundData: any) => {
        setIsRefunding(true);
        try {
            await axiosInstance.post(`/admin/bookings/${id}/refund/`, refundData);
            mutate();
            setShowRefundModal(false);
        } catch (error) {
            console.error('Refund processing failed:', error);
        } finally {
            setIsRefunding(false);
        }
    };

    const handleAddAdminNote = async () => {
        if (!newAdminNote.trim()) return;

        setIsAddingNote(true);
        try {
            await axiosInstance.post(`/admin/bookings/${id}/notes/`, {
                note: newAdminNote,
                admin_id: 'current_admin',
            });
            setNewAdminNote('');
            mutate();
        } catch (error) {
            console.error('Failed to add admin note:', error);
        } finally {
            setIsAddingNote(false);
        }
    };

    const handleConfirmJob = async (jobData: any) => {
        setIsConfirmingJob(true);
        try {
            await axiosInstance.post(`/requests/${id}/confirm_as_job/`, jobData);
            mutate();
            setShowConfirmJobModal(false);
            // Show success message or redirect
        } catch (error) {
            showRequestError(error);
        } finally {
            setIsConfirmingJob(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Booking Not Found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Enhanced Header with Admin Controls */}
            <BookingDetailHeader
                booking={booking}
                activeTab={activeTab}
                setActiveTab={(tab: string) => setActiveTab(tab as 'overview' | 'financial' | 'operations')}
                onStatusOverride={() => setShowStatusOverride(true)}
                onPriceAdjustment={() => setShowPriceAdjustment(true)}
                onRefund={() => setShowRefundModal(true)}
                onConfirmJob={() => setShowConfirmJobModal(true)}
                onRefresh={() => mutate()}
            />

            <div className="mx-auto px-4 py-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <BookingOverviewTab
                        booking={booking}
                        onStatusOverride={() => setShowStatusOverride(true)}
                        onPriceAdjustment={() => setShowPriceAdjustment(true)}
                        onRefund={() => setShowRefundModal(true)}
                        onProviderAssignment={() => setShowDriverAssignment(true)}
                        onConfirmJob={() => setShowConfirmJobModal(true)}
                        newAdminNote={newAdminNote}
                        setNewAdminNote={setNewAdminNote}
                        onAddAdminNote={handleAddAdminNote}
                        isAddingNote={isAddingNote}
                    />
                )}

                {/* Financial Tab */}
                {activeTab === 'financial' && (
                    <BookingFinancialTab
                        booking={booking}
                        onPriceAdjustment={() => setShowPriceAdjustment(true)}
                        onRefund={() => setShowRefundModal(true)}
                    />
                )}

                {/* Operations Tab */}
                {activeTab === 'operations' && (
                    <BookingOperationsTab
                        booking={booking}
                        onProviderAssignment={() => setShowDriverAssignment(true)}
                        newAdminNote={newAdminNote}
                        setNewAdminNote={setNewAdminNote}
                        onAddAdminNote={handleAddAdminNote}
                        isAddingNote={isAddingNote}
                    />
                )}

            </div>

            {/* Modals */}
            {showStatusOverride && (
                <StatusOverrideModal
                    isOpen={showStatusOverride}
                    onClose={() => setShowStatusOverride(false)}
                    onConfirm={handleStatusOverride}
                    currentStatus={booking.status}
                    isLoading={isStatusUpdating}
                />
            )}

            {showPriceAdjustment && (
                <PriceAdjustmentModal
                    isOpen={showPriceAdjustment}
                    onClose={() => setShowPriceAdjustment(false)}
                    onConfirm={handlePriceAdjustment}
                    currentPrice={booking.final_price || booking.base_price || 0}
                    isLoading={isPriceAdjusting}
                />
            )}

            {showRefundModal && (
                <RefundModal 
                    isOpen={showRefundModal} 
                    onClose={() => setShowRefundModal(false)} 
                    onConfirm={handleRefund} 
                    totalAmount={booking.final_price || booking.base_price || 0} 
                    isLoading={isRefunding} 
                />
            )}

            {showDriverAssignment && (
                <DriverAssignmentModal
                    isOpen={showDriverAssignment}
                    onClose={() => setShowDriverAssignment(false)}
                    onConfirm={handleDriverAssignment}
                    currentDriver={booking.driver}
                    isLoading={isDriverAssigning}
                />
            )}

            {showConfirmJobModal && (
                <ConfirmJobModal 
                    isOpen={showConfirmJobModal} 
                    onClose={() => setShowConfirmJobModal(false)} 
                    onConfirm={handleConfirmJob} 
                    booking={booking} 
                    isLoading={isConfirmingJob} 
                />
            )}
        </div>
    );
};

export default EnhancedBookingDetail;
