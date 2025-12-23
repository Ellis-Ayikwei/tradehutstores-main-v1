import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  faArrowLeft, 
  faCircle, 
  faReply, 
  faCheckCircle, 
  faPaperclip, 
  faTimes, 
  faExclamationCircle,
  faClock,
  faUserCircle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Types for the ticket data
interface TicketMessage {
  id: string;
  sender: 'customer' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
  attachments?: string[];
}

interface SupportTicket {
  id: string;
  subject: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    accountType: 'customer' | 'provider';
  };
  status: 'open' | 'in-progress' | 'closed' | 'pending-customer';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  assignedTo?: {
    id: string;
    name: string;
  };
}

const SupportTicketDetail = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [newStatus, setNewStatus] = useState<SupportTicket['status'] | ''>('');

  useEffect(() => {
    // Mock fetching ticket data - in a real app, this would be an API call
    const fetchTicket = async () => {
      setLoading(true);
      try {
        // Simulate API fetch delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock data for this ticket
        const mockTicket: SupportTicket = {
          id: ticketId || 'T-1001',
          subject: 'Issue with booking confirmation',
          customer: {
            id: 'C-2056',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '+44 7700 900123',
            accountType: 'customer'
          },
          status: 'in-progress',
          priority: 'high',
          category: 'Booking Issues',
          createdAt: '2023-11-15T14:30:00Z',
          updatedAt: '2023-11-16T09:15:00Z',
          messages: [
            {
              id: 'M-1',
              sender: 'customer',
              senderName: 'Jane Smith',
              message: 'I completed a booking yesterday but haven\'t received any confirmation email. The payment was taken from my account but I\'m not sure if the booking went through. Can you please check and confirm?',
              timestamp: '2023-11-15T14:30:00Z'
            },
            {
              id: 'M-2',
              sender: 'admin',
              senderName: 'Support Agent',
              message: 'Hi Jane, thank you for reaching out. I\'ll check your booking status right away. Could you please provide the approximate time you made the booking and any reference number you might have seen on screen?',
              timestamp: '2023-11-15T15:45:00Z'
            },
            {
              id: 'M-3',
              sender: 'customer',
              senderName: 'Jane Smith',
              message: 'It was around 2 PM yesterday. I don\'t have a reference number as the page refreshed after payment. My booking was for a van to move furniture this coming Saturday.',
              timestamp: '2023-11-15T16:20:00Z',
              attachments: ['payment_screenshot.jpg']
            }
          ],
          assignedTo: {
            id: 'A-103',
            name: 'Support Agent'
          }
        };
        
        setTicket(mockTicket);
        setNewStatus(mockTicket.status);
      } catch (err) {
        setError('Failed to load ticket details. Please try again later.');
        console.error('Error fetching ticket:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;

    // In a real app, send this to an API
    const newMessage: TicketMessage = {
      id: `M-${ticket?.messages.length ? ticket.messages.length + 1 : 1}`,
      sender: 'admin',
      senderName: 'Support Agent', // Would come from auth context in a real app
      message: reply,
      timestamp: new Date().toISOString(),
      attachments: attachments.length ? attachments.map(file => file.name) : undefined
    };

    setTicket(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, newMessage],
        updatedAt: new Date().toISOString()
      };
    });

    // Clear form
    setReply('');
    setAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const updateTicketStatus = () => {
    if (!newStatus || !ticket) return;
    
    // In a real app, send this to an API
    setTicket(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        status: newStatus as SupportTicket['status'],
        updatedAt: new Date().toISOString()
      };
    });
  };

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open':
        return 'text-blue-500';
      case 'in-progress':
        return 'text-yellow-500';
      case 'closed':
        return 'text-green-500';
      case 'pending-customer':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-yellow-100 text-yellow-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
            <span>{error || 'Ticket not found'}</span>
          </div>
          <button 
            onClick={() => navigate('/admin/support-tickets')}
            className="mt-3 bg-white text-red-700 border border-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded transition-colors"
          >
            Return to Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with back button */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/admin/support-tickets')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back to All Tickets
        </button>
      </div>

      {/* Ticket header info */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            <div className="flex items-center gap-2 mt-1 text-gray-600">
              <span>Ticket #{ticket.id}</span>
              <span>•</span>
              <span>Created {formatDate(ticket.createdAt)}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className={`px-3 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
            </div>
            <div className="flex items-center">
              <FontAwesomeIcon icon={faCircle} className={`mr-2 ${getStatusColor(ticket.status)}`} size="xs" />
              <span className="font-medium">
                {ticket.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Customer</h3>
            <p className="font-medium">{ticket.customer.name}</p>
            <p className="text-sm text-gray-600">{ticket.customer.email}</p>
            {ticket.customer.phone && <p className="text-sm text-gray-600">{ticket.customer.phone}</p>}
            <p className="text-sm text-gray-600 mt-1">
              Account Type: {ticket.customer.accountType.charAt(0).toUpperCase() + ticket.customer.accountType.slice(1)}
            </p>
            <button className="mt-2 text-blue-600 text-sm hover:text-blue-800">
              View Customer Profile
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Details</h3>
            <p className="text-sm"><span className="font-medium">Category:</span> {ticket.category}</p>
            <p className="text-sm"><span className="font-medium">Last Updated:</span> {formatDate(ticket.updatedAt)}</p>
            <p className="text-sm">
              <span className="font-medium">Assigned To:</span> {ticket.assignedTo?.name || 'Unassigned'}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Update Status</h3>
            <div className="flex gap-2">
              <select 
                value={newStatus} 
                onChange={(e) => setNewStatus(e.target.value as SupportTicket['status'])}
                className="flex-grow py-2 px-3 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="pending-customer">Pending Customer</option>
                <option value="closed">Closed</option>
              </select>
              <button 
                onClick={updateTicketStatus}
                disabled={!newStatus || newStatus === ticket.status}
                className={`px-4 py-2 rounded-md ${
                  !newStatus || newStatus === ticket.status
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation thread */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Conversation</h2>
        
        <div className="space-y-6">
          {ticket.messages.map((message, index) => (
            <div key={message.id} className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${message.sender === 'admin' ? 'bg-blue-50' : 'bg-gray-100'} p-4 rounded-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <FontAwesomeIcon 
                      icon={faUserCircle} 
                      className={`mr-2 ${message.sender === 'admin' ? 'text-blue-600' : 'text-gray-600'}`} 
                    />
                    <span className="font-medium">{message.senderName}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {message.sender === 'customer' ? 'Customer' : 'Support Team'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(message.timestamp)}
                  </span>
                </div>
                
                <div className="text-gray-800 whitespace-pre-line">
                  {message.message}
                </div>
                
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.attachments.map((attachment, i) => (
                        <div key={i} className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm flex items-center">
                          <FontAwesomeIcon icon={faPaperclip} className="mr-2" size="sm" />
                          {attachment}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {index === 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <span className="inline-flex items-center text-xs text-gray-500">
                      <FontAwesomeIcon icon={faClock} className="mr-1" />
                      Initial Request
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Reply form */}
        <form onSubmit={handleSubmitReply} className="mt-8 border-t pt-6">
          <h3 className="font-medium mb-3 flex items-center">
            <FontAwesomeIcon icon={faReply} className="mr-2 text-blue-600" />
            Reply to Customer
          </h3>
          
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply here..."
            rows={4}
            className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-3"
            required
          />
          
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Attachments:</p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="bg-gray-100 rounded-md px-3 py-2 flex items-center">
                    <FontAwesomeIcon icon={faPaperclip} className="text-gray-500 mr-2" />
                    <span className="text-sm truncate max-w-xs">{file.name}</span>
                    <button 
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="ml-2 text-gray-500 hover:text-red-500"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <label className="flex items-center text-blue-600 cursor-pointer">
              <FontAwesomeIcon icon={faPaperclip} className="mr-2" />
              <span>Add Attachment</span>
              <input 
                type="file"
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
            </label>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!reply.trim()}
                className={`px-4 py-2 rounded-md ${
                  !reply.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <FontAwesomeIcon icon={faReply} className="mr-2" />
                Send Reply
              </button>
              <button
                type="button"
                onClick={() => {
                  setTicket(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      status: 'closed',
                      updatedAt: new Date().toISOString()
                    };
                  });
                  setNewStatus('closed');
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                Close Ticket
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Internal notes section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Internal Notes</h2>
        <textarea
          placeholder="Add internal notes here (only visible to support team)..."
          rows={3}
          className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-3"
        />
        <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md">
          Save Notes
        </button>
      </div>
    </div>
  );
};

export default SupportTicketDetail;
