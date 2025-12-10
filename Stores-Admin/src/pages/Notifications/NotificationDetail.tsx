import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faArrowLeft,
  faCalendarAlt,
  faTruck,
  faMoneyBillWave,
  faExclamationCircle,
  faEye,
  faTrash,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { format } from 'date-fns';
import { mockNotifications } from '../../data/mockdata';


const NotificationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotificationDetail = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // In a real implementation, you'd call an API
        // const response = await api.getNotification(id);
        // setNotification(response.data);
        
        // Using mock data
        setTimeout(() => {
          const foundNotification = mockNotifications.find(n => n.id === id);
          if (foundNotification) {
            setNotification(foundNotification);
          } else {
            setError('Notification not found');
          }
          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error fetching notification details', error);
        setError('Failed to load notification details');
        setIsLoading(false);
      }
    };

    if (id) {
      fetchNotificationDetail();
    }
  }, [id]);

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

  const handleGoBack = () => {
    navigate('/notifications');
  };

  const handleAction = () => {
    if (notification?.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'booking':
        return 'Booking Update';
      case 'payment':
        return 'Payment Notification';
      case 'alert':
        return 'Alert';
      case 'reminder':
        return 'Reminder';
      case 'system':
        return 'System Message';
      default:
        return 'Notification';
    }
  };

  return (
    <div className="w-full px-4 md:px-8 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <button 
          onClick={handleGoBack}
          className="mb-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back to notifications
        </button>
        
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500 text-2xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{error}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">The notification you're looking for doesn't exist or was deleted.</p>
            <button 
              onClick={handleGoBack}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Return to notifications
            </button>
          </div>
        ) : notification ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className={`p-6 ${
              notification.type === 'booking' ? 'bg-blue-50 dark:bg-blue-900/20' : 
              notification.type === 'payment' ? 'bg-green-50 dark:bg-green-900/20' : 
              notification.type === 'alert' ? 'bg-red-50 dark:bg-red-900/20' : 
              notification.type === 'reminder' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
              'bg-purple-50 dark:bg-purple-900/20'
            } border-b border-gray-200 dark:border-gray-700`}>
              <div className="flex items-start">
                <div className="mr-4">
                  <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {getNotificationTypeLabel(notification.type)}
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{notification.title}</h1>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <time dateTime={notification.createdAt}>
                      {format(new Date(notification.createdAt), 'MMMM d, yyyy h:mm a')}
                    </time>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-gray-800 dark:text-gray-200 leading-relaxed mb-6">
                {notification.message}
              </div>
              
              {notification.bookingId && (
                <div className="mb-6 bg-gray-50 dark:bg-gray-750 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Related Booking
                      </div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {notification.bookingId}
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/bookings/${notification.bookingId}`)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex items-center"
                    >
                      View booking
                      <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-1" />
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                {notification.actionUrl && (
                  <button
                    onClick={handleAction}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
                  >
                    <FontAwesomeIcon icon={faEye} className="mr-2" />
                    {notification.type === 'booking' ? 'View Booking' : 
                     notification.type === 'payment' ? 'View Payment' : 
                     'View Details'}
                  </button>
                )}
                
                <button
                  onClick={handleGoBack}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Dismiss
                </button>
                
                <button
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center ml-auto"
                >
                  <FontAwesomeIcon icon={faTrash} className="mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default NotificationDetail;