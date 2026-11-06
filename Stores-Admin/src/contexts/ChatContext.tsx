import React, { createContext, useContext, useState, useEffect, useCallback, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Define types
export interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'provider' | 'system';
  status?: 'sent' | 'delivered' | 'read';
  attachments?: { id: string; url: string; type: string; name: string }[];
}

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isTyping: boolean;
  messages: Message[];
  provider: {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
    reviewCount: number;
    company?: string;
    email?: string;
    phone?: string;
  };
  booking?: {
    id: string;
    status: string;
    date: string;
    service: string;
  };
}

interface ChatState {
  chats: Chat[];
  selectedChatId?: string;
  loading: boolean;
  error?: string;
}

type ChatAction = 
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'SELECT_CHAT'; payload: string }
  | { type: 'NEW_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'SET_TYPING'; payload: { chatId: string; isTyping: boolean } }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ'; payload?: undefined }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string };

interface ChatContextType {
  state: ChatState;
  selectChat: (chatId: string) => void;
  sendMessage: (chatId: string, content: string, attachments?: File[]) => void;
  markAsRead: (chatId: string) => void;
  markAllAsRead: () => void;
  setTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  createNewChat: () => void;
}

// Create context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Reducer function
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CHATS':
      return {
        ...state,
        chats: action.payload,
        loading: false
      };
      
    case 'SELECT_CHAT':
      return {
        ...state,
        selectedChatId: action.payload
      };
      
    case 'NEW_MESSAGE': {
      const { chatId, message } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, message],
              lastMessage: message.content,
              lastMessageTime: message.timestamp,
              unreadCount: chat.id === state.selectedChatId && message.sender === 'user' 
                ? chat.unreadCount 
                : message.sender === 'provider' 
                ? chat.unreadCount + 1 
                : chat.unreadCount
            };
          }
          return chat;
        })
      };
    }
      
    case 'SET_TYPING': {
      const { chatId, isTyping } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              isTyping
            };
          }
          return chat;
        })
      };
    }
      
    case 'MARK_AS_READ':
      return {
        ...state,
        chats: state.chats.map(chat => {
          if (chat.id === action.payload) {
            return {
              ...chat,
              unreadCount: 0,
              messages: chat.messages.map(message => {
                if (message.sender === 'provider' && message.status !== 'read') {
                  return { ...message, status: 'read' };
                }
                return message;
              })
            };
          }
          return chat;
        })
      };
      
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        chats: state.chats.map(chat => ({
          ...chat,
          unreadCount: 0,
          messages: chat.messages.map(message => {
            if (message.sender === 'provider' && message.status !== 'read') {
              return { ...message, status: 'read' };
            }
            return message;
          })
        }))
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
      
    default:
      return state;
  }
}

// Mock data for initial chats
// No chat backend yet: start empty (never seed fake conversations).
const mockChats: Chat[] = [];

// Provider component
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, {
    chats: [],
    loading: true
  });

  // Load chats
  useEffect(() => {
    // Simulate API call
    const fetchChats = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await api.getChats();
        // dispatch({ type: 'SET_CHATS', payload: response.data });
        
        // Using mock data
        setTimeout(() => {
          dispatch({ type: 'SET_CHATS', payload: mockChats });
        }, 1000);
      } catch (error) {
        console.error('Error fetching chats', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load chats' });
      }
    };
    
    fetchChats();
  }, []);

  // Select a chat
  const selectChat = useCallback((chatId: string) => {
    dispatch({ type: 'SELECT_CHAT', payload: chatId });
    dispatch({ type: 'MARK_AS_READ', payload: chatId });
  }, []);

  // Send a message
  const sendMessage = useCallback((chatId: string, content: string, attachments?: File[]) => {
    // In a real app, we would upload attachments to a server first
    const uploadedAttachments = attachments?.map(file => ({
      id: uuidv4(),
      url: URL.createObjectURL(file), // This would be a server URL in a real app
      type: file.type,
      name: file.name
    }));

    const newMessage: Message = {
      id: uuidv4(),
      content,
      timestamp: new Date().toISOString(),
      sender: 'user',
      status: 'sent',
      attachments: uploadedAttachments
    };
    
    dispatch({ type: 'NEW_MESSAGE', payload: { chatId, message: newMessage } });
    
    // Simulate server response
    setTimeout(() => {
      // Update message status to delivered
      const updatedMessage = { ...newMessage, status: 'delivered' };
      dispatch({ type: 'NEW_MESSAGE', payload: { chatId, message: updatedMessage } });
      
      // Simulate provider typing
      dispatch({ type: 'SET_TYPING', payload: { chatId, isTyping: true } });
      
      // Simulate provider response
      setTimeout(() => {
        dispatch({ type: 'SET_TYPING', payload: { chatId, isTyping: false } });
        
        let responseContent = '';
        
        if (content.toLowerCase().includes('hello') || content.toLowerCase().includes('hi')) {
          responseContent = 'Hello! How can I help you today?';
        } else if (content.toLowerCase().includes('time')) {
          responseContent = 'We can schedule your move at a time that works best for you. When would you prefer?';
        } else if (content.toLowerCase().includes('price') || content.toLowerCase().includes('cost')) {
          responseContent = 'The cost will depend on the specific services you need. Would you like me to provide a quote?';
        } else if (content.toLowerCase().includes('thank')) {
          responseContent = "You're welcome! Let me know if you need anything else.";
        } else {
          responseContent = "Thank you for your message. I'll get back to you shortly with more information.";
        }
        
        const responseMessage: Message = {
          id: uuidv4(),
          content: responseContent,
          timestamp: new Date().toISOString(),
          sender: 'provider',
          status: 'sent'
        };
        
        dispatch({ type: 'NEW_MESSAGE', payload: { chatId, message: responseMessage } });
      }, 3000);
    }, 1000);
  }, []);

  // Mark as read
  const markAsRead = useCallback((chatId: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: chatId });
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
  }, []);

  // Set typing indicator
  const setTyping = useCallback((chatId: string) => {
    // In a real app, we'd send a typing indicator via the chat socket
  }, []);

  // Stop typing indicator
  const stopTyping = useCallback((chatId: string) => {
    // In a real app, we'd send a stop typing indicator via the chat socket
  }, []);

  // Create a new support chat
  const createNewChat = useCallback(() => {
    // In a real app, we'd create a new chat via the API
    const newChatId = uuidv4();
    
    const newChat: Chat = {
      id: newChatId,
      name: 'Support Team',
      isOnline: true,
      unreadCount: 1,
      isTyping: false,
      messages: [
        {
          id: uuidv4(),
          content: 'Welcome to TradeHut support! How can we help you today?',
          timestamp: new Date().toISOString(),
          sender: 'provider',
          status: 'sent'
        }
      ],
      provider: {
        id: 'support',
        name: 'Support Team',
        rating: 4.9,
        reviewCount: 1024,
        company: 'TradeHut',
        email: 'support@tradehut.com'
      },
      lastMessage: 'Welcome to TradeHut support! How can we help you today?',
      lastMessageTime: new Date().toISOString()
    };
    
    dispatch({ type: 'SET_CHATS', payload: [...state.chats, newChat] });
    dispatch({ type: 'SELECT_CHAT', payload: newChatId });
  }, [state.chats]);

  const value = {
    state,
    selectChat,
    sendMessage,
    markAsRead,
    markAllAsRead,
    setTyping,
    stopTyping,
    createNewChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// Hook to use chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};