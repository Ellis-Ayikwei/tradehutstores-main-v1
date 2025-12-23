import React, { useState, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import ChatThread from './ChatThread';
import ChatInput from './ChatInput';
import EmptyChat from './EmptyChat';
import ProviderInfo from './ProviderInfo';
import useMediaQuery from '../../hooks/useMediaQuery';

interface ChatContainerProps {
  chat: {
    id: string;
    name: string;
    messages: Array<any>;
    // other properties
  };
  onBack?: () => void;
  onSendMessage: (chatId: string, message: string, attachments?: File[]) => void;
  onSetTyping: (chatId: string) => void;
  onStopTyping: (chatId: string) => void;
  isTyping?: boolean;
  typingUser?: string;
  loading?: boolean;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  chat,
  onSendMessage,
  onSetTyping,
  onStopTyping,
  isTyping = false,
  typingUser = '',
  onBack,
  loading = false
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const isMobile = useMediaQuery('(max-width: 640px)');
  
  useEffect(() => {
    // Reset info panel when chat changes
    if (isMobile) {
      setShowInfo(false);
    }
  }, [chat?.id, isMobile]);
  
  if (!chat) {
    return <EmptyChat />;
  }
  
  const handleSendMessage = (message: string, attachments?: File[]) => {
    onSendMessage(chat.id, message, attachments);
  };
  
  const handleTyping = () => {
    onSetTyping(chat.id);
  };
  
  const handleStopTyping = () => {
    onStopTyping(chat.id);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="flex flex-col flex-grow">
        <ChatHeader 
          title={chat.name}
          subtitle={chat.booking ? `Booking #${chat.booking.id}` : ''}
          avatar={chat.avatar}
          isOnline={chat.isOnline}
          onBackClick={isMobile ? onBack : undefined}
          onInfoClick={() => setShowInfo(!showInfo)}
          isMobile={isMobile}
        />
        
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-850">
          <ChatThread 
            messages={chat.messages}
            isTyping={isTyping}
            typingUser={typingUser}
            loading={loading}
          />
        </div>
        
        <ChatInput 
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
        />
      </div>
      
      {showInfo && (
        <div className={`${isMobile ? 'absolute inset-0 z-10' : ''}`}>
          <ProviderInfo 
            provider={chat.provider}
            booking={chat.booking}
            onClose={() => setShowInfo(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ChatContainer;