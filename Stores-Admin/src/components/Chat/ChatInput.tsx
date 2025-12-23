import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, faSmile, faImage, 
  faPaperclip, faMicrophone, faTimes 
} from '@fortawesome/free-solid-svg-icons';

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: File[]) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onTyping,
  onStopTyping,
  disabled = false,
  placeholder = "Type a message..." 
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = () => {
    onTyping();
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout for stopping typing indication
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message, attachments);
      setMessage('');
      setAttachments([]);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        onStopTyping();
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setAttachments(prev => [...prev, ...fileArray]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleVoiceRecording = () => {
    // This would integrate with a proper voice recording API
    setIsRecording(!isRecording);
  };

  return (
    <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file, index) => (
            <div 
              key={index} 
              className="bg-gray-100 dark:bg-gray-700 rounded-md p-1 pr-2 flex items-center"
            >
              {file.type.startsWith('image/') ? (
                <div className="w-8 h-8 mr-1">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={file.name} 
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              ) : (
                <FontAwesomeIcon icon={faPaperclip} className="text-gray-500 mr-1" />
              )}
              <span className="text-xs truncate max-w-[100px]">{file.name}</span>
              <button 
                onClick={() => removeAttachment(index)}
                className="ml-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <FontAwesomeIcon icon={faTimes} size="xs" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center">
        <div className="flex space-x-2 mr-2">
          <button
            type="button"
            onClick={triggerFileInput}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <FontAwesomeIcon icon={faImage} />
          </button>
          <button
            type="button"
            onClick={triggerFileInput}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <FontAwesomeIcon icon={faPaperclip} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
        </div>
        
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (e.target.value) handleTyping();
          }}
          placeholder={disabled ? "Chat is unavailable" : placeholder}
          disabled={disabled}
          className="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="flex space-x-2 ml-2">
          {message.trim() || attachments.length > 0 ? (
            <button
              type="submit"
              disabled={disabled}
              className={`${
                disabled ? 'bg-gray-300 dark:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'
              } text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors`}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleVoiceRecording}
              disabled={disabled}
              className={`${
                isRecording ? 'bg-red-500' : disabled ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'
              } text-gray-600 dark:text-gray-300 rounded-full w-10 h-10 flex items-center justify-center transition-colors`}
            >
              <FontAwesomeIcon icon={faMicrophone} className={isRecording ? 'text-white animate-pulse' : ''} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatInput;