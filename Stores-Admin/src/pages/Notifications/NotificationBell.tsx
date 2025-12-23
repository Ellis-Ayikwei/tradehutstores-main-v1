import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBell, 
  faCalendarAlt,
  faTruck,
  faMoneyBillWave,
  faExclamationCircle,
  faCheckDouble,
  faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';
import { Transition } from '@headlessui/react';
import { formatDistanceToNow } from 'date-fns';
import { mockNotifications } from '../../data/mockdata';
import IconBell from '../../components/Icon/IconBell';
import IconBellBing from '../../components/Icon/IconBellBing';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Filter to get only unread notifications and sort by date
  const unreadNotifications = notifications
    .filter(notification => !notification.read)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const unreadCount = unreadNotifications.length;
  
  // Fetch notifications (simulated)
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // In a real app, fetch from API
        // const response = await api.getNotifications();
        // setNotifications(response.data);
        
        // Using mock data
        setNotifications(mockNotifications);
      } catch (error) {
        console.error('Error fetching notifications', error);
      }
    };

    fetchNotifications();
    
    // Set up polling for new notifications
    const interval = setInterval(fetchNotifications, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle marking a notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Handle marking all notifications as read
  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prevNotifications =>
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setIsDropdownOpen(false);
    
    if (notification.action_url) {
      navigate(notification.action_url);
    } else {
      navigate(`/notifications/${notification.id}`);
    }
  };

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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button 
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-label="Notifications"
      >
        
        <span>
                                        <IconBellBing />
                                        
        {/* Notification badge */}
        {unreadCount > 0 && (
          <span className="flex absolute w-3 h-3 ltr:right-0 rtl:left-0 top-0">
          <span className="animate-ping absolute ltr:-left-[3px] rtl:-right-[3px] -top-[3px] inline-flex h-full w-full rounded-full bg-success/50 opacity-75"></span>
          <span className="relative inline-flex rounded-full w-[6px] h-[6px] bg-success"></span>
      </span>
        )}
                                    </span>
        
      </button>

      {/* Dropdown menu */}
      <Transition
        show={isDropdownOpen}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead} 
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
              >
                <FontAwesomeIcon icon={faCheckDouble} className="mr-1" />
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {unreadCount > 0 ? (
              <ul>
                {unreadNotifications.slice(0, 5).map((notification) => (
                  <li 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                  >
                    <div className="p-3 flex">
                      <div className="mr-3 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
                
                {unreadNotifications.length > 5 && (
                  <div className="p-2 text-center border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {unreadNotifications.length - 5} more notification{unreadNotifications.length - 5 !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </ul>
            ) : (
              <div className="py-6 px-4 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faBell} className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No new notifications</p>
              </div>
            )}
          </div>

          <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-center">
            <button 
              onClick={() => {
                navigate('/notifications');
                setIsDropdownOpen(false);
              }} 
              className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 py-1 flex items-center justify-center"
            >
              View all notifications
              <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-1" />
            </button>
          </div>
        </div>
      </Transition>
    </div>
  );
};

export default NotificationBell;