import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments } from '@fortawesome/free-solid-svg-icons';

interface EmptyChatProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

const EmptyChat: React.FC<EmptyChatProps> = ({
  title = 'No Conversation Selected',
  message = 'Select a conversation from the list or start a new one.',
  icon = <FontAwesomeIcon icon={faComments} className="text-4xl text-gray-400" />
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-md">{message}</p>
    </div>
  );
};

export default EmptyChat;