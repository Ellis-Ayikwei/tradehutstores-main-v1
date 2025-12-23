import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  Trash2,
  RefreshCw
} from 'lucide-react';
import useSWR from 'swr';
import axiosInstance from '../../../services/axiosInstance';
import showMessage from '../../../helper/showMessage';
import {
  NotificationSummary,
  NotificationPreferences,
  ComposeMessage,
  NotificationFilters,
  BulkActions,
  NotificationList
} from './components';

interface Notification {
  id: string;
  user: string;
  notification_type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  read_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  delivery_channels: string[];
  scheduled_for?: string;
  delivered_at?: string;
  email_sent: boolean;
  sms_sent: boolean;
  push_sent: boolean;
  related_object_type?: string;
  related_object_id?: string;
  action_url?: string;
  action_text?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

interface NotificationFilters {
  read: 'all' | 'read' | 'unread';
  priority: 'all' | 'low' | 'normal' | 'high' | 'urgent';
  type: string;
  search: string;
}

const NotificationManagement: React.FC = () => {
  const [filters, setFilters] = useState<NotificationFilters>({
    read: 'all',
    priority: 'all',
    type: '',
    search: ''
  });
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string>('email');
  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({
    email: false,
    sms: false,
    push: false,
    in_app: false
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Preferences (load/save) - Updated for new model structure
  const { data: prefs, mutate: mutatePrefs, isLoading: prefsLoading } = useSWR(
    '/notifications/preferences/',
    async (url: string) => {
      const response = await axiosInstance.get(url);
      return response.data;
    }
  );
  const [prefsForm, setPrefsForm] = useState<any>({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    in_app_notifications: true,
    email_types: {
      booking_created: true,
      booking_confirmed: true,
      booking_cancelled: true,
      request_update: true,
      provider_accepted: true,
      provider_assigned: true,
      job_assigned_to_provider: true,
      job_started: true,
      job_in_transit: true,
      job_completed: true,
      job_cancelled: true,
      account_verified: true,
      provider_verified: true,
      account_suspended: true,
      account_reactivated: true,
      payment_pending: true,
      payment_confirmed: true,
      payment_failed: true,
      payment_refunded: true,
      deposit_received: true,
      bid_received: true,
      bid_accepted: true,
      bid_rejected: true,
      bid_counter_offer: true,
      message_received: true,
      support_ticket_created: true,
      support_ticket_updated: true,
      review_received: true,
      rating_reminder: true,
      system_maintenance: true,
      policy_update: true,
      feature_announcement: false,
      account_warning: true
    },
    sms_types: {
      job_assigned_to_provider: true,
      payment_failed: true,
      account_suspended: true,
      booking_cancelled: true
    },
    push_types: {
      job_assigned_to_provider: true,
      booking_confirmed: true,
      job_started: true,
      job_completed: true,
      message_received: true,
      bid_received: true,
      bid_accepted: true
    },
    in_app_types: {
      booking_created: true,
      booking_confirmed: true,
      booking_cancelled: true,
      request_update: true,
      provider_accepted: true,
      provider_assigned: true,
      job_assigned_to_provider: true,
      job_started: true,
      job_in_transit: true,
      job_completed: true,
      job_cancelled: true,
      account_verified: true,
      provider_verified: true,
      account_suspended: true,
      account_reactivated: true,
      payment_pending: true,
      payment_confirmed: true,
      payment_failed: true,
      payment_refunded: true,
      deposit_received: true,
      bid_received: true,
      bid_accepted: true,
      bid_rejected: true,
      bid_counter_offer: true,
      message_received: true,
      support_ticket_created: true,
      support_ticket_updated: true,
      review_received: true,
      rating_reminder: true,
      system_maintenance: true,
      policy_update: true,
      feature_announcement: true,
      account_warning: true
    }
  });
  
  useEffect(() => {
    if (prefs) {
      // Merge fetched preferences with default types to ensure all types are shown
      const defaultTypes = {
        booking_created: true,
        booking_confirmed: true,
        booking_cancelled: true,
        request_update: true,
        provider_accepted: true,
        provider_assigned: true,
        job_assigned_to_provider: true,
        job_started: true,
        job_in_transit: true,
        job_completed: true,
        job_cancelled: true,
        account_verified: true,
        provider_verified: true,
        account_suspended: true,
        account_reactivated: true,
        payment_pending: true,
        payment_confirmed: true,
        payment_failed: true,
        payment_refunded: true,
        deposit_received: true,
        bid_received: true,
        bid_accepted: true,
        bid_rejected: true,
        bid_counter_offer: true,
        message_received: true,
        support_ticket_created: true,
        support_ticket_updated: true,
        review_received: true,
        rating_reminder: true,
        system_maintenance: true,
        policy_update: true,
        feature_announcement: false,
        account_warning: true
      };

      setPrefsForm({
        email_notifications: prefs.email_notifications ?? true,
        sms_notifications: prefs.sms_notifications ?? false,
        push_notifications: prefs.push_notifications ?? true,
        in_app_notifications: prefs.in_app_notifications ?? true,
        email_types: { ...defaultTypes, ...(prefs.email_types || {}) },
        sms_types: { ...defaultTypes, ...(prefs.sms_types || {}) },
        push_types: { ...defaultTypes, ...(prefs.push_types || {}) },
        in_app_types: { ...defaultTypes, ...(prefs.in_app_types || {}) }
      });
    }
  }, [prefs]);
  const savePrefs = async () => {
    try {
      setIsSavingPrefs(true);
      await axiosInstance.post('/notifications/preferences/', prefsForm);
      mutatePrefs();
      showMessage('success', 'Preferences updated');
    } catch (e) {
      showMessage('error', 'Failed to update preferences');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // Compose (admin send to user)
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState<any>({
    target_type: 'user', // 'user', 'group', 'role', 'all'
    target_user: '',
    target_group: '',
    target_role: '',
    notification_type: 'system',
    title: '',
    message: '',
    priority: 'normal',
    delivery_channels: ['in_app'],
    data: {},
    action_url: '',
    action_text: '',
    expires_at: ''
  });
  // Load users for targeting
  const { data: usersData } = useSWR(
    '/users/?limit=1000&ordering=email',
    async (url: string) => {
      const response = await axiosInstance.get(url);
      return response.data?.results || response.data || [];
    }
  );

  // Load groups for targeting
  const { data: groupsData } = useSWR(
    '/auth/groups/',
    async (url: string) => {
      const response = await axiosInstance.get(url);
      return response.data?.results || response.data || [];
    }
  );

  // Load roles for targeting (assuming roles are user types)
  const { data: rolesData } = useSWR(
    '/users/roles/',
    async (url: string) => {
      const response = await axiosInstance.get(url);
      return response.data?.results || response.data || [];
    }
  );
  const sendNotification = async () => {
    try {
      // Prepare the notification payload based on target type
      let notificationPayload: any = {
        notification_type: compose.notification_type,
        title: compose.title,
        message: compose.message,
        priority: compose.priority,
        delivery_channels: compose.delivery_channels,
        data: compose.data,
        action_url: compose.action_url,
        action_text: compose.action_text,
        expires_at: compose.expires_at
      };

      // Add target-specific fields
      if (compose.target_type === 'user') {
        notificationPayload.user = compose.target_user;
      } else if (compose.target_type === 'group') {
        notificationPayload.group = compose.target_group;
      } else if (compose.target_type === 'role') {
        notificationPayload.user_role = compose.target_role;
      } else if (compose.target_type === 'all') {
        notificationPayload.send_to_all = true;
      }

      await axiosInstance.post('/notifications/', notificationPayload);
      setComposeOpen(false);
      showMessage('success', 'Notification sent');
    } catch (e) {
      showMessage('error', 'Failed to send notification');
    }
  };

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    if (filters.read !== 'all') {
      params.append('read', filters.read === 'read' ? 'true' : 'false');
    }
    
    if (filters.priority !== 'all') {
      params.append('priority', filters.priority);
    }
    
    if (filters.type) {
      params.append('type', filters.type);
    }
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    params.append('limit', '50');
    params.append('ordering', '-created_at');
    
    return params.toString();
  };

  // Fetch notifications
  const { data: notificationsData, error, mutate } = useSWR(
    `/notifications/?${buildQueryParams()}`,
    async (url: string) => {
      const response = await axiosInstance.get(url);
      return response.data;
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  // Fetch notification summary
  const { data: summaryData } = useSWR(
    '/notifications/summary/',
    async (url: string) => {
      const response = await axiosInstance.get(url);
      return response.data;
    }
  );

  const notifications = notificationsData?.results || notificationsData || [];
  const summary = summaryData || { total: 0, unread: 0, urgent: 0 };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedNotifications([]);
  };

  const handleSelectNotification = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(notificationId => notificationId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map((n: Notification) => n.id));
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await axiosInstance.post(`/notifications/${notificationId}/mark_as_read/`);
      mutate();
      showMessage('success', 'Notification marked as read');
    } catch (error) {
      showMessage('error', 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await axiosInstance.post('/notifications/mark_all_as_read/');
      mutate();
      showMessage('success', 'All notifications marked as read');
    } catch (error) {
      showMessage('error', 'Failed to mark all notifications as read');
    } finally {
      setLoading(false);
    }
  };

  const clearRead = async () => {
    try {
      setLoading(true);
      await axiosInstance.delete('/notifications/clear_read/');
      mutate();
      showMessage('success', 'Read notifications cleared');
    } catch (error) {
      showMessage('error', 'Failed to clear read notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedNotifications.length === 0) return;

    try {
      setLoading(true);
      
      if (bulkAction === 'mark_read') {
        for (const id of selectedNotifications) {
          await axiosInstance.post(`/notifications/${id}/mark_as_read/`);
        }
        showMessage('success', `${selectedNotifications.length} notifications marked as read`);
      } else if (bulkAction === 'delete') {
        for (const id of selectedNotifications) {
          await axiosInstance.delete(`/notifications/${id}/`);
        }
        showMessage('success', `${selectedNotifications.length} notifications deleted`);
      }
      
      mutate();
      setSelectedNotifications([]);
      setBulkAction('');
    } catch (error) {
      showMessage('error', 'Failed to perform bulk action');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="panel">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Bell className="w-8 h-8 mr-3 text-blue-600" />
              Notification Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and monitor system notifications
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => mutate()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            
            <button
              onClick={markAllAsRead}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </button>
            
            <button
              onClick={clearRead}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Read
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <NotificationSummary summary={summary} />

      {/* Preferences */}
      <NotificationPreferences
        prefsForm={prefsForm}
        setPrefsForm={setPrefsForm}
        savePrefs={savePrefs}
        prefsLoading={prefsLoading}
        activeChannel={activeChannel}
        setActiveChannel={setActiveChannel}
        expandedChannels={expandedChannels}
        setExpandedChannels={setExpandedChannels}
        isSaving={isSavingPrefs}
      />

      {/* Compose Message */}
      <ComposeMessage
        composeOpen={composeOpen}
        setComposeOpen={setComposeOpen}
        compose={compose}
        setCompose={setCompose}
        sendNotification={sendNotification}
        usersData={usersData || []}
        groupsData={groupsData || []}
      />

      {/* Filters */}
      <NotificationFilters
        filters={filters}
        handleFilterChange={handleFilterChange}
      />

      {/* Bulk Actions */}
      <BulkActions
        selectedNotifications={selectedNotifications}
        setSelectedNotifications={setSelectedNotifications}
        bulkAction={bulkAction}
        setBulkAction={setBulkAction}
        handleBulkAction={handleBulkAction}
        loading={loading}
      />

      {/* Notifications List */}
      <NotificationList
        notifications={notifications}
        selectedNotifications={selectedNotifications}
        handleSelectNotification={handleSelectNotification}
        handleSelectAll={handleSelectAll}
        markAsRead={markAsRead}
        filters={filters}
      />
    </div>
  );
};

export default NotificationManagement;
