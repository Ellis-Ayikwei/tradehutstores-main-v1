import React from 'react';
import { History, User, LogIn, LogOut, Key, Shield, FileText, CreditCard, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import useSWR from 'swr';
import fetcher from '../../../../services/fetcher';
import { UserProfile } from '../types';

interface UserActivityItem {
  id: string;
  activity_type: string;
  request?: {
    id: string;
    title: string;
  };
  details?: any;
  created_at: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface ActivitiesTabProps {
  profile: UserProfile | null;
  onRefresh?: () => void;
}

const ActivitiesTab: React.FC<ActivitiesTabProps> = ({ profile, onRefresh }) => {
  // Fetch user activities using SWR
  const { 
    data: activitiesData, 
    error: activitiesError, 
    isLoading: activitiesLoading,
    mutate
  } = useSWR(
    profile?.id ? `/users/${profile.id}/activity/` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const activities = activitiesData?.results || activitiesData || [];

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (activityType: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      login: LogIn,
      logout: LogOut,
      register: User,
      verify_email: CheckCircle,
      change_password: Key,
      reset_password: Key,
      update_profile: User,
      upload_avatar: User,
      enable_mfa: Shield,
      disable_mfa: Shield,
      create_request: FileText,
      update_request: FileText,
      cancel_request: XCircle,
      place_bid: CreditCard,
      update_bid: CreditCard,
      delete_bid: XCircle,
      upload_file: FileText,
      download_file: FileText,
      delete_file: XCircle,
      api_call: History,
      mfa_login: Shield,
    };
    return iconMap[activityType] || History;
  };

  const getActivityLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      login: 'Logged In',
      logout: 'Logged Out',
      register: 'Registered Account',
      verify_email: 'Verified Email',
      change_password: 'Changed Password',
      reset_password: 'Reset Password',
      update_profile: 'Updated Profile',
      upload_avatar: 'Uploaded Avatar',
      enable_mfa: 'Enabled MFA',
      disable_mfa: 'Disabled MFA',
      create_request: 'Created Request',
      update_request: 'Updated Request',
      cancel_request: 'Cancelled Request',
      place_bid: 'Placed Bid',
      update_bid: 'Updated Bid',
      delete_bid: 'Deleted Bid',
      upload_file: 'Uploaded File',
      download_file: 'Downloaded File',
      delete_file: 'Deleted File',
      api_call: 'API Call',
      mfa_login: 'MFA Login',
    };
    return labelMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActivityBadgeColor = (type: string) => {
    if (type.includes('login') || type.includes('verify') || type.includes('enable')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
    if (type.includes('logout') || type.includes('delete') || type.includes('cancel') || type.includes('disable')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
    if (type.includes('update') || type.includes('modify') || type.includes('change')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
    if (type.includes('create') || type.includes('register') || type.includes('upload')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const renderActivityDetails = (details: any) => {
    if (!details) return null;
    
    const detailItems = [];
    
    if (details.ip) {
      detailItems.push(`IP: ${details.ip}`);
    }
    if (details.user_agent) {
      detailItems.push(`Browser: ${details.user_agent.split(' ')[0]}`);
    }
    if (details.location) {
      detailItems.push(`Location: ${details.location}`);
    }
    if (details.device) {
      detailItems.push(`Device: ${details.device}`);
    }
    
    if (detailItems.length > 0) {
      return (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {detailItems.map((item, index) => (
            <span key={index}>
              {item}
              {index < detailItems.length - 1 && ' • '}
            </span>
          ))}
        </div>
      );
    }
    
    return null;
  };

  const handleRefresh = () => {
    mutate();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (activitiesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity History</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track your account activities and security events</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading...
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-40"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activitiesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity History</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track your account activities and security events</p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to Load Activities</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Unable to fetch your activity history. Please try again.</p>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity History</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track your account activities and security events
            {activities.length > 0 && (
              <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                ({activities.length} {activities.length === 1 ? 'activity' : 'activities'})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        {activities.length === 0 ? (
          <div className="p-6">
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Activities Found</h4>
              <p className="text-gray-600 dark:text-gray-400">Your activity history will appear here once you start using the system.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity: UserActivityItem) => {
              const IconComponent = getActivityIcon(activity.activity_type);
              return (
                <div key={activity.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {getActivityLabel(activity.activity_type)}
                        </p>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActivityBadgeColor(activity.activity_type)}`}>
                          {activity.activity_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {formatDate(activity.created_at)}
                      </p>
                      {activity.request && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                          Request: {activity.request.title}
                        </p>
                      )}
                      {renderActivityDetails(activity.details)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesTab;




