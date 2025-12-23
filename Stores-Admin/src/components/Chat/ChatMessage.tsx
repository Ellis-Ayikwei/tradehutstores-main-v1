import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckDouble, faCheck } from '@fortawesome/free-solid-svg-icons';

interface ChatMessageProps {
  content: string;
  timestamp: string;
  sender: 'user' | 'provider' | 'system';
  status?: 'sent' | 'delivered' | 'read';
  attachments?: { id: string; url: string; type: string; name: string }[];
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  content,
  timestamp,
  sender,
  status = 'sent',
  attachments = []
}) => {
  const isInbound = sender === 'provider';
  const isSystem = sender === 'system';
  
  const renderStatus = () => {
    if (isInbound || isSystem) return null;
    
    if (status === 'read') {
      return <FontAwesomeIcon icon={faCheckDouble} className="text-blue-500 ml-1" size="xs" />;
    } else if (status === 'delivered') {
      return <FontAwesomeIcon icon={faCheckDouble} className="text-gray-400 ml-1" size="xs" />;
    } else {
      return <FontAwesomeIcon icon={faCheck} className="text-gray-400 ml-1" size="xs" />;
    }
  };

  const renderAttachments = () => {
    if (attachments.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((file) => {
          if (file.type.startsWith('image/')) {
            return (
              <a 
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer" 
                className="block w-24 h-24 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700"
              >
                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
              </a>
            );
          } else {
            return (
              <a 
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer" 
                className="flex items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm"
              >
                <span className="truncate max-w-[7rem]">{file.name}</span>
              </a>
            );
          }
        })}
      </div>
    );
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
          {content}
          <span className="ml-2 text-gray-400">{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-4`}>
      <div 
        className={`max-w-[75%] px-4 py-2 rounded-lg ${
          isInbound 
            ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600' 
            : 'bg-blue-500 dark:bg-blue-600 text-white'
        }`}
      >
        <div className="text-sm">{content}</div>
        {renderAttachments()}
        <div className="flex items-center justify-end mt-1 text-xs opacity-70">
          <span>{formatDistanceToNow(new Date(timestamp), { addSuffix: false })}</span>
          {renderStatus()}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;