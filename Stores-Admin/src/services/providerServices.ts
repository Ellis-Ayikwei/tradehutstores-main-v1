import axiosInstance from "./axiosInstance";

// ============================================================================
// PROVIDER CRUD OPERATIONS
// ============================================================================

export const getProviders = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  verification_status?: string;
  business_type?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) => {
  try {
    const response = await axiosInstance.get('/providers/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching providers:', error);
    throw new Error('Failed to fetch providers');
  }
};

export const getProvider = async (id: string) => {
  try {
    const response = await axiosInstance.get(`/providers/${id}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching provider:', error);
    throw new Error('Failed to fetch provider');
  }
};

export const createProvider = async (providerData: any) => {
  try {
    const response = await axiosInstance.post('/providers/', providerData);
    return response.data;
  } catch (error) {
    console.error('Error creating provider:', error);
    throw new Error('Failed to create provider');
  }
};

export const updateProvider = async (id: string, providerData: any) => {
  try {
    const response = await axiosInstance.put(`/providers/${id}/`, providerData);
    return response.data;
  } catch (error) {
    console.error('Error updating provider:', error);
    throw new Error('Failed to update provider');
  }
};

export const deleteProvider = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/providers/${id}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting provider:', error);
    throw new Error('Failed to delete provider');
  }
};

// ============================================================================
// PROVIDER STATUS MANAGEMENT
// ============================================================================

export const activateProvider = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`/providers/${id}/activate/`);
    return response.data;
  } catch (error) {
    console.error('Error activating provider:', error);
    throw new Error('Failed to activate provider');
  }
};

export const suspendProvider = async (id: string, reason?: string) => {
  try {
    const response = await axiosInstance.patch(`/providers/${id}/suspend/`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error suspending provider:', error);
    throw new Error('Failed to suspend provider');
  }
};

export const deactivateProvider = async (id: string, reason?: string) => {
  try {
    const response = await axiosInstance.patch(`/providers/${id}/deactivate/`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error deactivating provider:', error);
    throw new Error('Failed to deactivate provider');
  }
};

export const verifyProvider = async (id: string, verificationData?: any) => {
  try {
    const response = await axiosInstance.patch(`/providers/${id}/verify/`, verificationData);
    return response.data;
  } catch (error) {
    console.error('Error verifying provider:', error);
    throw new Error('Failed to verify provider');
  }
};

export const rejectProvider = async (id: string, reason: string) => {
  try {
    const response = await axiosInstance.patch(`/providers/${id}/reject/`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error rejecting provider:', error);
    throw new Error('Failed to reject provider');
  }
};

// ============================================================================
// ADDRESS MANAGEMENT
// ============================================================================

export const getProviderAddresses = async (providerId: string) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/addresses/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching provider addresses:', error);
    throw new Error('Failed to fetch provider addresses');
  }
};

export const createProviderAddress = async (providerId: string, addressData: any) => {
  try {
    console.log("data to create", addressData);
    const response = await axiosInstance.post(`/providers/${providerId}/create_address/`, addressData);
    return response.data;
  } catch (error) {
    console.error('Error creating provider address:', error);
    throw new Error('Failed to create provider address');
  }
};

export const updateProviderAddress = async (providerId: string, addressData: any) => {
  try {
  console.log("data to update", addressData);
    const response = await axiosInstance.patch(`/providers/${providerId}/update_address/`, addressData);
    return response.data;
  } catch (error) {
    console.error('Error updating provider address:', error);
    throw new Error('Failed to update provider address');
  }
};

export const deleteProviderAddress = async (providerId: string, addressId: string) => {
  try {
    const response = await axiosInstance.delete(`/providers/${providerId}/delete_address/${addressId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting provider address:', error);
    throw new Error('Failed to delete provider address');
  }
};

export const setPrimaryAddress = async (providerId: string, addressId: string) => {
  try {
    const response = await axiosInstance.patch(`/providers/${providerId}/set_primary_address/`, {id: addressId});
    return response.data;
  } catch (error) {
    console.error('Error setting primary address:', error);
    throw new Error('Failed to set primary address');
  }
};

export const verifyAddress = async (providerId: string, addressId: string, verificationData?: any) => {
  try {
    const response = await axiosInstance.patch(`/providers/${providerId}/addresses/${addressId}/verify/`, verificationData);
    return response.data;
  } catch (error) {
    console.error('Error verifying address:', error);
    throw new Error('Failed to verify address');
  }
};

// ============================================================================
// VEHICLE MANAGEMENT
// ============================================================================

export const getProviderVehicles = async (providerId: string) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/vehicles/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching provider vehicles:', error);
    throw new Error('Failed to fetch provider vehicles');
  }
};

export const createProviderVehicle = async (providerId: string, vehicleData: any) => {
  try {
    const response = await axiosInstance.post(`/providers/${providerId}/vehicles/`, vehicleData);
    return response.data;
  } catch (error) {
    console.error('Error creating provider vehicle:', error);
    throw new Error('Failed to create provider vehicle');
  }
};

export const updateProviderVehicle = async (providerId: string, vehicleId: string, vehicleData: any) => {
  try {
    const response = await axiosInstance.put(`/providers/${providerId}/vehicles/${vehicleId}/`, vehicleData);
    return response.data;
  } catch (error) {
    console.error('Error updating provider vehicle:', error);
    throw new Error('Failed to update provider vehicle');
  }
};

export const deleteProviderVehicle = async (providerId: string, vehicleId: string) => {
  try {
    const response = await axiosInstance.delete(`/providers/${providerId}/vehicles/${vehicleId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting provider vehicle:', error);
    throw new Error('Failed to delete provider vehicle');
  }
};

// ============================================================================
// DRIVER MANAGEMENT
// ============================================================================

export const getProviderDrivers = async (providerId: string) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/drivers/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching provider drivers:', error);
    throw new Error('Failed to fetch provider drivers');
  }
};

export const createProviderDriver = async (providerId: string, driverData: any) => {
  try {
    const response = await axiosInstance.post(`/providers/${providerId}/drivers/`, driverData);
    return response.data;
  } catch (error) {
    console.error('Error creating provider driver:', error);
    throw new Error('Failed to create provider driver');
  }
};

export const updateProviderDriver = async (providerId: string, driverId: string, driverData: any) => {
  try {
    const response = await axiosInstance.put(`/providers/${providerId}/drivers/${driverId}/`, driverData);
    return response.data;
  } catch (error) {
    console.error('Error updating provider driver:', error);
    throw new Error('Failed to update provider driver');
  }
};

export const deleteProviderDriver = async (providerId: string, driverId: string) => {
  try {
    const response = await axiosInstance.delete(`/providers/${providerId}/drivers/${driverId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting provider driver:', error);
    throw new Error('Failed to delete provider driver');
  }
};

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

export const getProviderDocuments = async (providerId: string) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/documents/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching provider documents:', error);
    throw new Error('Failed to fetch provider documents');
  }
};

export const uploadProviderDocument = async (providerId: string, documentData: FormData) => {
  try {
    const response = await axiosInstance.post(`/providers/${providerId}/documents/`, documentData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading provider document:', error);
    throw new Error('Failed to upload provider document');
  }
};

export const updateProviderDocument = async (providerId: string, documentId: string, documentData: any) => {
  try {
    const response = await axiosInstance.put(`/providers/${providerId}/documents/${documentId}/`, documentData);
    return response.data;
  } catch (error) {
    console.error('Error updating provider document:', error);
    throw new Error('Failed to update provider document');
  }
};

export const deleteProviderDocument = async (providerId: string, documentId: string) => {
  try {
    const response = await axiosInstance.delete(`/providers/${providerId}/documents/${documentId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting provider document:', error);
    throw new Error('Failed to delete provider document');
  }
};

export const verifyProviderDocument = async (providerId: string, documentId: string, verificationData?: any) => {
  try {
    const response = await axiosInstance.patch(`/providers/${providerId}/documents/${documentId}/verify/`, verificationData);
    return response.data;
  } catch (error) {
    console.error('Error verifying provider document:', error);
    throw new Error('Failed to verify provider document');
  }
};

export const rejectProviderDocument = async (providerId: string, documentId: string, reason: string) => {
  try {
    const response = await axiosInstance.patch(`/providers/${providerId}/documents/${documentId}/reject/`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error rejecting provider document:', error);
    throw new Error('Failed to reject provider document');
  }
};

// ============================================================================
// SERVICE MANAGEMENT
// ============================================================================

export const getProviderServices = async (providerId: string) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/services/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching provider services:', error);
    throw new Error('Failed to fetch provider services');
  }
};

export const updateProviderServices = async (providerId: string, servicesData: any) => {
  try {
    const response = await axiosInstance.put(`/providers/${providerId}/services/`, servicesData);
    return response.data;
  } catch (error) {
    console.error('Error updating provider services:', error);
    throw new Error('Failed to update provider services');
  }
};

export const addProviderService = async (providerId: string, serviceData: any) => {
  try {
    const response = await axiosInstance.post(`/providers/${providerId}/services/`, serviceData);
    return response.data;
  } catch (error) {
    console.error('Error adding provider service:', error);
    throw new Error('Failed to add provider service');
  }
};

export const removeProviderService = async (providerId: string, serviceId: string) => {
  try {
    const response = await axiosInstance.delete(`/providers/${providerId}/services/${serviceId}/`);
    return response.data;
  } catch (error) {
    console.error('Error removing provider service:', error);
    throw new Error('Failed to remove provider service');
  }
};

// ============================================================================
// PAYMENT MANAGEMENT
// ============================================================================

export const getProviderPayments = async (providerId: string, params?: {
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
}) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/payments/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching provider payments:', error);
    throw new Error('Failed to fetch provider payments');
  }
};

export const getProviderPaymentSummary = async (providerId: string, params?: {
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/payments/summary/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching provider payment summary:', error);
    throw new Error('Failed to fetch provider payment summary');
  }
};

export const processProviderPayment = async (providerId: string, paymentData: any) => {
  try {
    const response = await axiosInstance.post(`/providers/${providerId}/payments/`, paymentData);
    return response.data;
  } catch (error) {
    console.error('Error processing provider payment:', error);
    throw new Error('Failed to process provider payment');
  }
};

// ============================================================================
// REVIEW MANAGEMENT
// ============================================================================

export const getProviderReviews = async (providerId: string, params?: {
  page?: number;
  limit?: number;
  rating?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/reviews/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching provider reviews:', error);
    throw new Error('Failed to fetch provider reviews');
  }
};

export const getProviderRatingStats = async (providerId: string) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/reviews/stats/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching provider rating stats:', error);
    throw new Error('Failed to fetch provider rating stats');
  }
};

// ============================================================================
// JOB MANAGEMENT
// ============================================================================

export const getProviderJobs = async (providerId: string, params?: {
  page?: number;
  limit?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/jobs/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching provider jobs:', error);
    throw new Error('Failed to fetch provider jobs');
  }
};

export const getProviderJobStats = async (providerId: string, params?: {
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/jobs/stats/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching provider job stats:', error);
    throw new Error('Failed to fetch provider job stats');
  }
};

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export const getProviderAnalytics = async (providerId: string, params?: {
  start_date?: string;
  end_date?: string;
  metric?: string;
}) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/analytics/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching provider analytics:', error);
    throw new Error('Failed to fetch provider analytics');
  }
};

export const getProviderPerformanceReport = async (providerId: string, params?: {
  start_date?: string;
  end_date?: string;
  report_type?: string;
}) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/reports/performance/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching provider performance report:', error);
    throw new Error('Failed to fetch provider performance report');
  }
};

export const getProviderFinancialReport = async (providerId: string, params?: {
  start_date?: string;
  end_date?: string;
  report_type?: string;
}) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/reports/financial/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching provider financial report:', error);
    throw new Error('Failed to fetch provider financial report');
  }
};

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

export const getProviderNotifications = async (providerId: string, params?: {
  page?: number;
  limit?: number;
  type?: string;
  read?: boolean;
}) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/notifications/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching provider notifications:', error);
    throw new Error('Failed to fetch provider notifications');
  }
};

export const markNotificationAsRead = async (providerId: string, notificationId: string) => {
  try {
    const response = await axiosInstance.patch(`/providers/${providerId}/notifications/${notificationId}/read/`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
};

export const sendProviderNotification = async (providerId: string, notificationData: any) => {
  try {
    const response = await axiosInstance.post(`/providers/${providerId}/notifications/`, notificationData);
    return response.data;
  } catch (error) {
    console.error('Error sending provider notification:', error);
    throw new Error('Failed to send provider notification');
  }
};

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

export const getProviderSettings = async (providerId: string) => {
  try {
    const response = await axiosInstance.get(`/providers/${providerId}/settings/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching provider settings:', error);
    throw new Error('Failed to fetch provider settings');
  }
};

export const updateProviderSettings = async (providerId: string, settingsData: any) => {
  try {
    const response = await axiosInstance.put(`/providers/${providerId}/settings/`, settingsData);
    return response.data;
  } catch (error) {
    console.error('Error updating provider settings:', error);
    throw new Error('Failed to update provider settings');
  }
};

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export const bulkUpdateProviders = async (providerIds: string[], updateData: any) => {
  try {
    const response = await axiosInstance.patch('/providers/bulk-update/', {
      provider_ids: providerIds,
      ...updateData
    });
    return response.data;
  } catch (error) {
    console.error('Error bulk updating providers:', error);
    throw new Error('Failed to bulk update providers');
  }
};

export const bulkDeleteProviders = async (providerIds: string[]) => {
  try {
    const response = await axiosInstance.delete('/providers/bulk-delete/', {
      data: { provider_ids: providerIds }
    });
    return response.data;
  } catch (error) {
    console.error('Error bulk deleting providers:', error);
    throw new Error('Failed to bulk delete providers');
  }
};

export const exportProviders = async (params?: {
  format?: 'csv' | 'excel' | 'pdf';
  filters?: any;
}) => {
  try {
    const response = await axiosInstance.get('/providers/export/', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting providers:', error);
    throw new Error('Failed to export providers');
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const searchProviders = async (query: string, filters?: any) => {
  try {
    const response = await axiosInstance.get('/providers/search/', {
      params: { q: query, ...filters }
    });
        return response.data;
    } catch (error) {
    console.error('Error searching providers:', error);
    throw new Error('Failed to search providers');
  }
};

export const getProviderStats = async () => {
  try {
    const response = await axiosInstance.get('/providers/stats/');
    return response.data;
  } catch (error) {
    console.error('Error fetching provider stats:', error);
    throw new Error('Failed to fetch provider stats');
  }
};

export const validateProviderData = async (providerData: any) => {
  try {
    const response = await axiosInstance.post('/providers/validate/', providerData);
    return response.data;
  } catch (error) {
    console.error('Error validating provider data:', error);
    throw new Error('Failed to validate provider data');
  }
};