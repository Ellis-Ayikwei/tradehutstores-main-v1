import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import TypeIndicator from './TypeIndicator';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'provider' | 'system';
  status?: 'sent' | 'delivered' | 'read';
  attachments?: { id: string; url: string; type: string; name: string }[];
}

interface ChatThreadProps {
  messages: Message[];
  isTyping?: boolean;
  typingUser?: string;
  loading?: boolean;
}

const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  isTyping = false,
  typingUser = '',
  loading = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-3 text-gray-500 dark:text-gray-400">Loading messages...</p>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-gray-800 dark:text-gray-200 font-medium">No messages yet</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-md">
          Send a message to start the conversation. Our team typically responds within 24 hours.
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          content={message.content}
          timestamp={message.timestamp}
          sender={message.sender}
          status={message.status}
          attachments={message.attachments}
        />
      ))}
      
      {isTyping && (
        <div className="flex justify-start mb-4">
          <div className="max-w-[75%] px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
            <TypeIndicator name={typingUser || 'Provider'} />
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatThread;