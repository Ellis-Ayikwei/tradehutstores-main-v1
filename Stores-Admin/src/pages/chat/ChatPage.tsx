import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../../contexts/ChatContext';
import ChatList from '../../components/Chat/ChatList';
import ChatContainer from '../../components/Chat/ChatContainer';
import EmptyChat from '../../components/Chat/EmptyChat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus } from '@fortawesome/free-solid-svg-icons';
import useMediaQuery from '../../hooks/useMediaQuery';

const ChatPage: React.FC = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const { 
    state: { chats, selectedChatId, loading },
    selectChat,
    sendMessage,
    setTyping,
    stopTyping,
    createNewChat
  } = useChat();
  const [showChatList, setShowChatList] = useState(true);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [scrollPosition, setScrollPosition] = useState(0);

  // Find the selected chat
  const selectedChat = chats.find(chat => chat.id === (selectedChatId || chatId));
  
  // Update selected chat when URL changes
  useEffect(() => {
    if (chatId && chatId !== selectedChatId) {
      selectChat(chatId);
    }
  }, [chatId, selectChat, selectedChatId]);
  
  // Update URL when selected chat changes
  useEffect(() => {
    if (selectedChatId && selectedChatId !== chatId) {
      navigate(`/chat/${selectedChatId}`);
    }
  }, [selectedChatId, navigate, chatId]);
  
  // Handle mobile view
  useEffect(() => {
    if (isMobile) {
      setShowChatList(!selectedChatId);
    } else {
      setShowChatList(true);
    }
  }, [isMobile, selectedChatId]);
  
  // Handle chat selection
  const handleSelectChat = (id: string) => {
    setScrollPosition(window.scrollY);
    selectChat(id);
    if (isMobile) {
      setShowChatList(false);
    }
    setTimeout(() => {
      window.scrollTo({ top: scrollPosition, behavior: 'auto' });
    }, 0);
  };
  

useEffect(() => {
  if (selectedChatId) {
    document.body.classList.add('no-scroll');
  } else {
    document.body.classList.remove('no-scroll');
  }
}, [selectedChatId]);


  // Handle back button on mobile
  const handleBackToList = () => {
    setShowChatList(true);
    navigate('/chat');
  };
  
  // Handle new chat creation
  const handleNewChat = () => {
    createNewChat();
  };
  
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Messages</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="flex h-[calc(100vh-200px)]">
            {/* Chat List */}
            {(showChatList || !isMobile) && (
              <div className={`${isMobile ? 'w-full' : 'w-1/3 border-r border-gray-200 dark:border-gray-700'} flex flex-col`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Conversations</h2>
                  <button 
                    onClick={handleNewChat}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700 rounded-full"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ChatList
                    chats={chats}
                    selectedChatId={selectedChatId || chatId}
                    onSelectChat={handleSelectChat}
                    loading={loading} 
                    type={'provider'}     // This might need to be dynamic
                  />
                </div>
              </div>
            )}
            
            {/* Chat Container */}
            {(!isMobile || !showChatList) && (
              <div className={`${isMobile ? 'w-full' : 'w-2/3'} flex flex-col`}>
                {selectedChat ? (
                  <ChatContainer
                    chat={selectedChat}
                    onBack={isMobile ? handleBackToList : undefined}
                    onSendMessage={sendMessage}
                    onSetTyping={setTyping}
                    onStopTyping={stopTyping}
                  />
                ) : loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="ml-2">Loading chat...</p>
                  </div>
                ) : (
                  <EmptyChat onNewChat={handleNewChat} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;