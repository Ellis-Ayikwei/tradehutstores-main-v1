import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Bubble } from '@ant-design/x';
import { Job } from '../../../types/job';
import { Message } from '../../../types/message';
import axiosInstance from '../../../services/axiosInstance';
import confirmDialog from '../../../helper/confirmDialog';

interface ChatTabProps {
    job: Job & { request?: { messages?: Message[] } };
    onSendMessage: (message: string, attachments?: File[]) => void;
    onMessageUpdate?: () => void; // Callback to refresh messages after edit/delete
}

const ChatTab: React.FC<ChatTabProps> = ({ job, onSendMessage, onMessageUpdate }) => {
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [localMessages, setLocalMessages] = useState<Message[]>(job?.request?.messages || []);
    const [isUpdating, setIsUpdating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Update local messages when job.messages changes
    useEffect(() => {
        if (job?.request?.messages) {
            setLocalMessages(job.request.messages);
        }
    }, [job?.request?.messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (message.trim() || attachments.length > 0) {
            try {
                await onSendMessage(message, attachments);
                setMessage('');
                setAttachments([]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const fileArray = Array.from(files);
            const maxSize = 10 * 1024 * 1024; // 10MB
            const validFiles = fileArray.filter(file => {
                if (file.size > maxSize) {
                    alert(`File "${file.name}" exceeds 10MB limit`);
                    return false;
                }
                return true;
            });
            setAttachments([...attachments, ...validFiles]);
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    const handleEditKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSaveEdit();
        } else if (event.key === 'Escape') {
            handleCancelEdit();
        }
    };

    const toggleDropdown = (messageId: string) => {
        setOpenDropdownId(openDropdownId === messageId ? null : messageId);
    };

    const handleEditMessage = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditContent(msg.content);
        setOpenDropdownId(null);
    };

    const handleSaveEdit = async () => {
        if (editingMessageId && editContent.trim() && !isUpdating) {
            setIsUpdating(true);
            try {
                setLocalMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.id === editingMessageId
                            ? { ...msg, content: editContent.trim(), updated_at: new Date().toISOString() }
                            : msg
                    )
                );

                const response = await axiosInstance.patch(`/messages/${editingMessageId}/`, {
                    content: editContent.trim()
                });

                setLocalMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.id === editingMessageId
                            ? { ...msg, ...response.data }
                            : msg
                    )
                );

                setEditingMessageId(null);
                setEditContent('');
                
                if (onMessageUpdate) {
                    onMessageUpdate();
                }
            } catch (error) {
                console.error('Failed to edit message:', error);
                setLocalMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.id === editingMessageId
                            ? { ...msg, content: job?.request?.messages?.find((m: Message) => m.id === editingMessageId)?.content || msg.content }
                            : msg
                    )
                );
            } finally {
                setIsUpdating(false);
            }
        }
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditContent('');
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (isUpdating) return;
        
        const confirmed = await confirmDialog({
            title: 'Delete Message',
            body: 'This action will permanently delete this message.',
            note: 'This action cannot be undone.',
            finalQuestion: 'Are you sure you want to delete this message?',
            type: 'warning',
            confirmText: 'Delete',
            denyText: 'Cancel',
            cancelText: 'Cancel'
        });
        
        if (!confirmed) return;
        
        setIsUpdating(true);
        let deletedMessage: Message | undefined;
        
        try {
            deletedMessage = localMessages.find(msg => msg.id === messageId);
            setLocalMessages(prevMessages =>
                prevMessages.filter(msg => msg.id !== messageId)
            );

            await axiosInstance.delete(`/messages/${messageId}/`);
            
            setOpenDropdownId(null);
            
            if (onMessageUpdate) {
                onMessageUpdate();
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
            if (deletedMessage) {
                setLocalMessages(prevMessages => [...prevMessages, deletedMessage as Message]);
            }
        } finally {
            setIsUpdating(false);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId && dropdownRefs.current[openDropdownId]) {
                const dropdown = dropdownRefs.current[openDropdownId];
                if (dropdown && !dropdown.contains(event.target as Node)) {
                    setOpenDropdownId(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openDropdownId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [localMessages]);

    // Get other party info
    const otherParty = React.useMemo(() => {
        if (localMessages.length > 0) {
            const firstMessage = localMessages[0];
            return firstMessage.is_sender ? firstMessage.receiver : firstMessage.sender;
        }
        return null;
    }, [localMessages]);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden h-[600px] flex flex-col">
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Chat</h2>
                {otherParty && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {otherParty.first_name && otherParty.last_name
                            ? `${otherParty.first_name} ${otherParty.last_name}`
                            : otherParty.email || 'Chat'}
                    </p>
                )}
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {localMessages.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                            Start the conversation by sending a message
                        </p>
                    </div>
                ) : (
                    <>
                        {localMessages.map((msg: Message) => (
                            <div key={msg.id} className="relative group">
                                <Bubble
                                    placement={msg.is_sender ? 'end' : 'start'}
                                    avatar={{
                                        src: msg.is_sender 
                                            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.email || msg.sender.id)}&background=random`
                                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.receiver.email || msg.receiver.id)}&background=random`,
                                    }}
                                    content={
                                        <div className="relative">
                                            {/* Edit/Delete dropdown - only show for sender's messages */}
                                            {msg.is_sender && editingMessageId !== msg.id && (
                                                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <div className="relative" ref={(el) => (dropdownRefs.current[msg.id] = el)}>
                                                        <button
                                                            onClick={() => toggleDropdown(msg.id)}
                                                            disabled={isUpdating}
                                                            className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                        
                                                        {openDropdownId === msg.id && (
                                                            <div className="absolute right-0 top-8 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                                                                <button
                                                                    onClick={() => handleEditMessage(msg)}
                                                                    disabled={isUpdating}
                                                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center disabled:opacity-50"
                                                                >
                                                                    <Edit className="w-3 h-3 mr-2" />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                                    disabled={isUpdating}
                                                                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center disabled:opacity-50"
                                                                >
                                                                    <Trash2 className="w-3 h-3 mr-2" />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Message content - show edit input if editing */}
                                            {editingMessageId === msg.id ? (
                                                <div className="space-y-2 min-w-[200px]">
                                                    <textarea
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        onKeyPress={handleEditKeyPress}
                                                        disabled={isUpdating}
                                                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none disabled:opacity-50"
                                                        rows={Math.max(1, editContent.split('\n').length)}
                                                        autoFocus
                                                    />
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            disabled={isUpdating || !editContent.trim()}
                                                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isUpdating ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            disabled={isUpdating}
                                                            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    {msg.content && (
                                                        <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">{msg.content}</p>
                                                    )}
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {msg.time_since_sent || new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {msg.attachment_url && (
                                                        <div className="mt-2">
                                                            {msg.is_image ? (
                                                                <img
                                                                    src={msg.attachment_url}
                                                                    alt={msg.attachment_name || 'Image'}
                                                                    className="max-w-xs max-h-48 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-90"
                                                                    onClick={() => window.open(msg.attachment_url || '', '_blank')}
                                                                />
                                                            ) : (
                                                                <a
                                                                    href={msg.attachment_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                                                >
                                                                    📎 {msg.attachment_name || 'Download'}
                                                                    {msg.formatted_file_size && (
                                                                        <span className="ml-2 text-xs text-gray-500">
                                                                            ({msg.formatted_file_size})
                                                                        </span>
                                                                    )}
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    }
                                />
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Message input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                {/* Attachments preview */}
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {attachments.map((file, index) => (
                            <div key={index} className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                                <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                                <span className="text-xs text-gray-500">
                                    ({formatFileSize(file.size)})
                                </span>
                                <button
                                    onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title="Attach file"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1 min-h-[40px] max-h-[120px] p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                        rows={1}
                    />
                    <button
                        type="submit"
                        disabled={!message.trim() && attachments.length === 0}
                        className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatTab;
