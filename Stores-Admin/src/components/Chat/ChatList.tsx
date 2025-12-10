import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus } from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';

interface ChatContact {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline: boolean;
  isTyping?: boolean;
  bookingId?: string;
}

interface ChatListProps {
  chats: ChatContact[];
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
  onCreateNewChat?: () => void;
  type: 'customer' | 'provider';
  loading?: boolean;
}

const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onCreateNewChat,
  type,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const filteredChats = React.useMemo(() => {
    if (!searchQuery) return chats;
    
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => 
      chat.name.toLowerCase().includes(query) || 
      (chat.bookingId && chat.bookingId.toLowerCase().includes(query))
    );
  }, [chats, searchQuery]);
  
  return (
    <div className="flex flex-col h-full border-r dark:border-gray-700">
      <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Messages</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 pl-10 pr-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <FontAwesomeIcon 
            icon={faSearch} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" 
          />
        </div>
        
        {type === 'customer' && onCreateNewChat && (
          <button 
            onClick={onCreateNewChat}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Contact Support</span>
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading chats...</p>
          </div>
        ) : filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`cursor-pointer p-4 border-b dark:border-gray-700 ${
                selectedChatId === chat.id 
                  ? 'bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <div className="flex items-start">
                <div className="relative mr-3">
                  {chat.avatar ? (
                    <img 
                      src={chat.avatar} 
                      alt={chat.name} 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 font-medium">
                        {chat.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                    chat.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}></span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-medium truncate ${
                      chat.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {chat.name}
                    </h3>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  
                  {chat.bookingId && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Booking: {chat.bookingId}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {chat.isTyping ? (
                        <span className="text-blue-500 dark:text-blue-400">Typing...</span>
                      ) : (
                        chat.lastMessage || "No messages yet"
                      )}
                    </p>
                    
                    {chat.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-blue-500 text-white text-xs">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-gray-800 dark:text-gray-200 font-medium mb-1">No chats found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              {searchQuery
                ? "No conversations match your search"
                : type === 'customer' 
                  ? "Start a conversation with support" 
                  : "No customer inquiries yet"
              }
            </p>
            
            {type === 'customer' && onCreateNewChat && !searchQuery && (
              <button 
                onClick={onCreateNewChat}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Contact Support</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;