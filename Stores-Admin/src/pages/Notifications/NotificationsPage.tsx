import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faEnvelope,
  faCalendarAlt,
  faTruck,
  faMoneyBillWave,
  faExclamationCircle,
  faCheck,
  faTrash,
  faCheckDouble,
  faFilter,
  faSearch,
  faEllipsisV,
  faClock,
  faCircle,
  faEye,
  faArchive,
  faArrowDown,
  faInfoCircle,
  faTimes,
  faCheckCircle,
  faUndoAlt,
  faHeadset,
  faFileInvoiceDollar,
  faCreditCard,
  faCog
} from '@fortawesome/free-solid-svg-icons';
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { Menu, Transition, Listbox } from '@headlessui/react';
import { mockNotifications } from '../../data/mockdata';

// Define notification preferences
const notificationPreferences = {
  email: true,
  push: true,
  sms: false,
};

// Group headers for time-based sections
const timeGroups = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This Week",
  thisMonth: "This Month",
  older: "Older"
};

// Define available actions by notification type
const notificationActions = {
  booking: [
    { label: "View Booking", icon: faEye, action: "view" },
    { label: "Contact Support", icon: faHeadset, action: "contact" }
  ],
  payment: [
    { label: "View Receipt", icon: faFileInvoiceDollar, action: "view" },
    { label: "Payment Methods", icon: faCreditCard, action: "manage" }
  ],
  alert: [
    { label: "Learn More", icon: faInfoCircle, action: "learn" },
    { label: "Dismiss", icon: faTimes, action: "dismiss" }
  ],
  reminder: [
    { label: "View Details", icon: faEye, action: "view" },
    { label: "Snooze", icon: faClock, action: "snooze" }
  ],
  system: [
    { label: "Acknowledge", icon: faCheckCircle, action: "acknowledge" },
    { label: "Settings", icon: faCog, action: "settings" }
  ]
};

// Simple error message component
const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center shadow-md">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
        <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500 text-2xl" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Something went wrong</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        {message || "An error occurred while displaying notifications."}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
      >
        <FontAwesomeIcon icon={faUndoAlt} className="mr-2" />
        Try again
      </button>
    </div>
  );
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread' | 'read'>('all');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const navigate = useNavigate();

  // Fetch notifications (simulated)
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, you'd call an API with pagination
      // const response = await api.getNotifications({ page: currentPage, filter: filterType, search: searchQuery });
      // setNotifications(response.data);
      // setHasMore(currentPage < response.meta.totalPages);
      
      // Using mock data with simulated pagination
      setTimeout(() => {
        setNotifications(mockNotifications);
        setHasMore(false); // No more pages in our mock
        setIsLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error fetching notifications', error);
      setError('Failed to load notifications');
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle load more
  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    
    setLoadingMore(true);
    setCurrentPage(prev => prev + 1);
    
    // Simulate loading more data
    setTimeout(() => {
      // In a real app, this would append new notifications from the next page
      // setNotifications(prev => [...prev, ...newNotifications]);
      setLoadingMore(false);
    }, 1000);
  };

  // Display status message
  const showStatusMessage = (type: 'success' | 'error' | 'info', message: string) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Handle marking notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
    
    // In a real app, you would call an API
    // api.markNotificationAsRead(notificationId);
  }, []);

  // Handle marking notification as unread
  const markAsUnread = useCallback((notificationId: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: false }
          : notification
      )
    );
    
    // In a real app, you would call an API
    // api.markNotificationAsUnread(notificationId);
  }, []);

  // Handle marking all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
    
    // In a real app, you would call an API
    // api.markAllNotificationsAsRead();
    
    showStatusMessage('success', "All notifications marked as read");
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else {
      navigate(`/notifications/${notification.id}`);
    }
  }, [markAsRead, navigate]);

  // Handle notification delete
  const deleteNotification = useCallback((notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== notificationId)
    );
    
    // In a real app, you would call an API
    // api.deleteNotification(notificationId);
    
    showStatusMessage('success', "Notification deleted");
  }, []);

  // Handle notification archive
  const archiveNotification = useCallback((notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== notificationId)
    );
    
    // In a real app, you would call an API
    // api.archiveNotification(notificationId);
    
    showStatusMessage('success', "Notification archived");
  }, []);

  // Handle quick action
  const handleQuickAction = useCallback((notification: Notification, action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Handle different actions based on type and action
    switch (action) {
      case 'view':
        handleNotificationClick(notification);
        break;
      case 'contact':
        navigate('/contact-support');
        break;
      case 'manage':
        navigate('/payment-methods');
        break;
      case 'dismiss':
        deleteNotification(notification.id, e);
        break;
      case 'snooze':
        showStatusMessage('info', "Notification snoozed for 24 hours");
        markAsRead(notification.id);
        break;
      case 'acknowledge':
        markAsRead(notification.id);
        showStatusMessage('success', "Notification acknowledged");
        break;
      case 'settings':
        navigate('/profile/notification-settings');
        break;
      default:
        handleNotificationClick(notification);
    }
  }, [handleNotificationClick, deleteNotification, markAsRead, navigate]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    // Filter based on tabs and search
    const filtered = notifications.filter(notification => {
      const matchesTab = 
        selectedTab === 'all' || 
        (selectedTab === 'unread' && !notification.read) || 
        (selectedTab === 'read' && notification.read);
        
      const matchesType = filterType === 'all' || notification.type === filterType;
      
      const matchesSearch = 
        searchQuery === '' || 
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (notification.bookingId && notification.bookingId.toLowerCase().includes(searchQuery.toLowerCase()));
        
      return matchesTab && matchesType && matchesSearch;
    });

    // Group by date
    const grouped = filtered.reduce((acc, notification) => {
      const date = new Date(notification.createdAt);
      let group: string;
      
      if (isToday(date)) group = 'today';
      else if (isYesterday(date)) group = 'yesterday';
      else if (isThisWeek(date)) group = 'thisWeek';
      else if (isThisMonth(date)) group = 'thisMonth';
      else group = 'older';

      if (!acc[group]) acc[group] = [];
      acc[group].push(notification);
      
      return acc;
    }, {} as Record<string, Notification[]>);

    // Sort each group by date (newest first)
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return grouped;
  }, [notifications, selectedTab, filterType, searchQuery]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <FontAwesomeIcon icon={faTruck} className="text-blue-500" />;
      case 'payment':
        return <FontAwesomeIcon icon={faMoneyBillWave} className="text-green-500" />;
      case 'alert':
        return <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500" />;
      case 'reminder':
        return <FontAwesomeIcon icon={faCalendarAlt} className="text-yellow-500" />;
      default:
        return <FontAwesomeIcon icon={faBell} className="text-purple-500" />;
    }
  };

  // Get available actions for a notification type
  const getActionsForNotificationType = (type: string) => {
    return notificationActions[type] || notificationActions.system;
  };

  // Count unread notifications
  const unreadCount = useMemo(() => 
    notifications.filter(notification => !notification.read).length, 
  [notifications]);

  // Check if there are any notifications after filtering
  const hasNotifications = useMemo(() => 
    Object.values(groupedNotifications).some(group => group.length > 0),
  [groupedNotifications]);

  // If there's an error, show the error message
  if (error) {
    return <ErrorMessage message={error} onRetry={fetchNotifications} />;
  }

  return (
    <div className="w-full px-4 md:px-8 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="w-full mx-auto">
        {/* Status message */}
        {statusMessage && (
          <div className={`mb-4 p-3 rounded-md ${
            statusMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400' :
            statusMessage.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400' :
            'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400'
          } flex items-center justify-between`}>
            <span>{statusMessage.message}</span>
            <button onClick={() => setStatusMessage(null)} className="text-gray-500 hover:text-gray-700">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-8 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-2xl font-bold mb-2 flex items-center">
                  <FontAwesomeIcon icon={faBell} className="mr-3" />
                  Notifications
                </h1>
                <p className="text-blue-100">
                  Stay updated with your moving journey
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-3">
                <button 
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center 
                    ${unreadCount === 0 
                      ? 'bg-opacity-50 bg-white cursor-not-allowed' 
                      : 'bg-white text-blue-600 hover:bg-blue-50'}`}
                >
                  <FontAwesomeIcon icon={faCheckDouble} className="mr-2" />
                  Mark all as read
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="bg-white bg-opacity-10 px-6 py-2 flex border-t border-white border-opacity-20">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'all' 
                  ? 'bg-white text-blue-600' 
                  : 'text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedTab('unread')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'unread' 
                  ? 'bg-white text-blue-600' 
                  : 'text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              Unread <span className="ml-1 px-1.5 py-0.5 text-xs bg-white bg-opacity-20 rounded-full">{unreadCount}</span>
            </button>
            <button
              onClick={() => setSelectedTab('read')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'read' 
                  ? 'bg-white text-blue-600' 
                  : 'text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              Read
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-md">
          <div className="flex flex-col md:flex-row justify-between space-y-3 md:space-y-0 md:items-center">
            <div className="relative flex-grow max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
              </div>
              <input 
                type="text"
                className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 
                        dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-blue-500 
                        focus:border-blue-500"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faFilter} className="text-gray-400 mr-1" />
              <select 
                className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white 
                        focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filter notifications by type"
              >
                <option value="all">All types</option>
                <option value="booking">Booking</option>
                <option value="payment">Payment</option>
                <option value="alert">Alert</option>
                <option value="reminder">Reminder</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mr-4">
              <FontAwesomeIcon icon={faBell} className="text-blue-500" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{notifications.length}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md flex items-center">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mr-4">
              <FontAwesomeIcon icon={faCircle} className="text-red-500" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Unread</div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{unreadCount}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md flex items-center">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mr-4">
              <FontAwesomeIcon icon={faCheck} className="text-green-500" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Read</div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{notifications.length - unreadCount}</div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md mb-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading your notifications...</p>
            </div>
          ) : hasNotifications ? (
            <div>
              {Object.entries(groupedNotifications).map(([group, items]) => (
                items.length > 0 && (
                  <div key={group} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750">
                      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {timeGroups[group]}
                      </h2>
                    </div>
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {items.map((notification) => (
                        <li 
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 md:px-6 md:py-5 flex relative cursor-pointer 
                                   hover:bg-gray-50 dark:hover:bg-gray-750 transition-all
                                   ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''}`}
                        >
                          {!notification.read && (
                            <span className="absolute right-4 top-4">
                              <FontAwesomeIcon icon={faCircle} className="text-blue-500 dark:text-blue-400 text-xs" />
                            </span>
                          )}
                          
                          <div className="mr-4 mt-1">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center
                              ${notification.type === 'booking' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                notification.type === 'payment' ? 'bg-green-100 dark:bg-green-900/30' :
                                notification.type === 'alert' ? 'bg-red-100 dark:bg-red-900/30' :
                                notification.type === 'reminder' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                'bg-purple-100 dark:bg-purple-900/30'}`}
                            >
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h3 className={`text-sm font-semibold ${!notification.read ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {notification.title}
                              </h3>
                              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2 mt-1 hidden sm:block">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {notification.bookingId && (
                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-400">
                                  {notification.bookingId}
                                </span>
                              )}
                              <span className="text-gray-500 dark:text-gray-400 flex items-center text-xs sm:hidden">
                                <FontAwesomeIcon icon={faClock} className="mr-1" />
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              
                              {/* Quick actions */}
                              <div className="flex-1"></div>
                              <div className="flex gap-2 mt-1 sm:mt-0">
                                {getActionsForNotificationType(notification.type).map((action, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => handleQuickAction(notification, action.action, e)}
                                    className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 
                                            text-gray-700 dark:text-gray-300 hover:bg-gray-200 
                                            dark:hover:bg-gray-600 transition-colors flex items-center"
                                  >
                                    <FontAwesomeIcon icon={action.icon} className="mr-1" />
                                    <span className="hidden sm:inline">{action.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-2 flex flex-shrink-0">
                            <Menu as="div" className="relative">
                              {({ open }) => (
                                <>
                                  <Menu.Button 
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                    aria-label="More options"
                                  >
                                    <FontAwesomeIcon icon={faEllipsisV} className="text-gray-500 dark:text-gray-400" />
                                  </Menu.Button>
                                  <Transition
                                    show={open}
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                  >
                                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          notification.read ? markAsUnread(notification.id) : markAsRead(notification.id);
                                        }}
                                        className={`${
                                          active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                        } flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                                      >
                                        <FontAwesomeIcon 
                                          icon={notification.read ? faCircle : faCheck} 
                                          className="mr-2" 
                                        />
                                        {notification.read ? 'Mark as unread' : 'Mark as read'}
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={(e) => archiveNotification(notification.id, e)}
                                        className={`${
                                          active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                        } flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                                      >
                                        <FontAwesomeIcon icon={faArchive} className="mr-2" />
                                        Archive
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={(e) => deleteNotification(notification.id, e)}
                                        className={`${
                                          active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                        } flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                                      >
                                        <FontAwesomeIcon icon={faTrash} className="mr-2" />
                                        Delete
                                      </button>
                                    )}
                                  </Menu.Item>
                                </Menu.Items>
                                  </Transition>
                                </>
                              )}
                            </Menu>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}

              {/* Load more button */}
              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 
                              dark:border-gray-600 ${loadingMore ? 'bg-gray-100 dark:bg-gray-700 cursor-wait' : 
                              'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    {loadingMore ? (
                      <>
                        <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent rounded-full"></span>
                        Loading...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faArrowDown} className="mr-2" />
                        Load more
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 px-4 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faBell} className="text-gray-400 dark:text-gray-500 text-3xl" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">No notifications found</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                {searchQuery || filterType !== 'all' || selectedTab !== 'all'
                  ? "Try adjusting your filters to find what you're looking for."
                  : "You don't have any notifications at the moment."}
              </p>
              {(searchQuery || filterType !== 'all' || selectedTab !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setSelectedTab('all');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notification preferences card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notification Preferences</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Email Notifications</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full ${notificationPreferences.email ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <span className={`${notificationPreferences.email ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Push Notifications</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications on your device</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full ${notificationPreferences.push ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <span className={`${notificationPreferences.push ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">SMS Notifications</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via text message</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full ${notificationPreferences.sms ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <span className={`${notificationPreferences.sms ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link
                to="/profile/notification-settings"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Manage all notification settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;