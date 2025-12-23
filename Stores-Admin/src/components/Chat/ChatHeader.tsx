import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEllipsisV, faPhone, faChevronLeft, faVideo, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  avatar?: string;
  isOnline?: boolean;
  onBackClick?: () => void;
  onInfoClick?: () => void;
  isMobile?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  subtitle,
  avatar,
  isOnline = false,
  onBackClick,
  onInfoClick,
  isMobile = false
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center">
        {isMobile && onBackClick && (
          <button 
            onClick={onBackClick}
            className="text-gray-500 mr-2"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
        )}
        
        <div className="relative">
          {avatar ? (
            <img 
              src={avatar} 
              alt={title} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500 font-medium">
                {title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {isOnline !== undefined && (
            <span 
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`} 
            />
          )}
        </div>
        
        <div className="ml-3">
          <h3 className="font-medium text-gray-800 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isOnline ? 'Online' : subtitle}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <FontAwesomeIcon icon={faInfoCircle} onClick={onInfoClick} />
        </button>
        <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <FontAwesomeIcon icon={faEllipsisV} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;