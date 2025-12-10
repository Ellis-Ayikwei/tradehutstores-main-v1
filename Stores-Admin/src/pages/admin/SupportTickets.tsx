import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFilter,
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faReply,
  faEnvelope,
  faEnvelopeOpen,
  faUser,
  faUserTie,
  faExclamationTriangle,
  faCheckCircle,
  faClock,
  faTag
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';
import FormTextArea from '../../components/ui/FormTextArea';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'general' | 'technical' | 'billing' | 'account' | 'booking' | 'provider' | 'other';
  customerId: string;
  customerName: string;
  customerEmail: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  lastResponseAt: string;
  lastResponseBy: 'customer' | 'support';
  responseCount: number;
  attachments?: string[];
}

const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    status: 'open',
    priority: 'medium',
    category: 'general',
    customerId: '',
    customerName: '',
    customerEmail: '',
    assignedTo: ''
  });
  
  useEffect(() => {
    fetchTickets();
  }, []);
  
  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter, priorityFilter, categoryFilter]);
  
  const fetchTickets = () => {
    // Mock data for support tickets
    const mockTickets: SupportTicket[] = [
      {
        id: 'T-1001',
        subject: 'Unable to complete booking payment',
        description: 'I\'ve been trying to make a payment for my booking but keep getting an error message saying "Payment processing failed".',
        status: 'open',
        priority: 'high',
        category: 'booking',
        customerId: 'C-2001',
        customerName: 'John Smith',
        customerEmail: 'john.smith@example.com',
        assignedTo: '',
        createdAt: '2025-04-10T09:30:00',
        updatedAt: '2025-04-10T09:30:00',
        lastResponseAt: '2025-04-10T09:30:00',
        lastResponseBy: 'customer',
        responseCount: 1
      },
      {
        id: 'T-1002',
        subject: 'Request for invoice correction',
        description: 'The invoice I received for my recent van rental has an incorrect company name. Could you please update it to "ABC Logistics Ltd" and resend?',
        status: 'in_progress',
        priority: 'medium',
        category: 'billing',
        customerId: 'C-2002',
        customerName: 'Emily Davis',
        customerEmail: 'emily.davis@example.com',
        assignedTo: 'Sarah Johnson',
        createdAt: '2025-04-07T14:15:00',
        updatedAt: '2025-04-08T10:20:00',
        lastResponseAt: '2025-04-08T10:20:00',
        lastResponseBy: 'support',
        responseCount: 3
      },
      {
        id: 'T-1003',
        subject: 'Problems accessing my account',
        description: 'I can\'t log into my account despite using the correct password. I\'ve tried resetting it but I\'m not receiving the reset email.',
        status: 'waiting_customer',
        priority: 'medium',
        category: 'account',
        customerId: 'C-2003',
        customerName: 'Robert Wilson',
        customerEmail: 'robert.wilson@example.com',
        assignedTo: 'Michael Brown',
        createdAt: '2025-04-05T11:45:00',
        updatedAt: '2025-04-06T16:30:00',
        lastResponseAt: '2025-04-06T16:30:00',
        lastResponseBy: 'support',
        responseCount: 4
      },
      {
        id: 'T-1004',
        subject: 'Van air conditioning not working',
        description: 'I rented a van yesterday and the air conditioning doesn\'t work at all. It\'s extremely hot and making our trip uncomfortable.',
        status: 'resolved',
        priority: 'high',
        category: 'technical',
        customerId: 'C-2004',
        customerName: 'David Garcia',
        customerEmail: 'david.garcia@example.com',
        assignedTo: 'Jennifer Miller',
        createdAt: '2025-04-02T08:20:00',
        updatedAt: '2025-04-03T13:15:00',
        lastResponseAt: '2025-04-03T12:45:00',
        lastResponseBy: 'customer',
        responseCount: 5
      },
      {
        id: 'T-1005',
        subject: 'Refund request for canceled booking',
        description: 'I had to cancel my booking due to a family emergency but haven\'t received my refund yet. The cancellation was made 5 days ago.',
        status: 'closed',
        priority: 'medium',
        category: 'billing',
        customerId: 'C-2005',
        customerName: 'Jessica Martinez',
        customerEmail: 'jessica.martinez@example.com',
        assignedTo: 'Sarah Johnson',
        createdAt: '2025-03-28T15:50:00',
        updatedAt: '2025-04-01T09:10:00',
        lastResponseAt: '2025-04-01T09:10:00',
        lastResponseBy: 'support',
        responseCount: 6
      },
      {
        id: 'T-1006',
        subject: 'Provider not responding to messages',
        description: 'I\'ve been trying to contact the van provider about specific pickup details but they haven\'t responded to any of my messages for the past 2 days.',
        status: 'open',
        priority: 'medium',
        category: 'provider',
        customerId: 'C-2006',
        customerName: 'Chris Thompson',
        customerEmail: 'chris.thompson@example.com',
        assignedTo: '',
        createdAt: '2025-04-09T10:25:00',
        updatedAt: '2025-04-09T10:25:00',
        lastResponseAt: '2025-04-09T10:25:00',
        lastResponseBy: 'customer',
        responseCount: 1
      },
      {
        id: 'T-1007',
        subject: 'Question about insurance options',
        description: 'I\'m planning to rent a van for a week and would like to know more about the different insurance options available.',
        status: 'in_progress',
        priority: 'low',
        category: 'general',
        customerId: 'C-2007',
        customerName: 'Matthew Clark',
        customerEmail: 'matthew.clark@example.com',
        assignedTo: 'Michael Brown',
        createdAt: '2025-04-08T16:40:00',
        updatedAt: '2025-04-09T11:05:00',
        lastResponseAt: '2025-04-09T11:05:00',
        lastResponseBy: 'support',
        responseCount: 2
      }
    ];
    
    setTickets(mockTickets);
  };
  
  const filterTickets = () => {
    let filtered = tickets;
    
    // Apply search term filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(ticket => 
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === categoryFilter);
    }
    
    setFilteredTickets(filtered);
    setCurrentPage(1); // Reset to first page on filter change
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };
  
  const handlePriorityFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPriorityFilter(e.target.value);
  };
  
  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
  };
  
  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyMessage(e.target.value);
  };
  
  const handleAddTicket = () => {
    setIsTicketModalOpen(true);
  };
  
  const handleCloseTicketModal = () => {
    setIsTicketModalOpen(false);
    // Reset form data
    setFormData({
      subject: '',
      description: '',
      status: 'open',
      priority: 'medium',
      category: 'general',
      customerId: '',
      customerName: '',
      customerEmail: '',
      assignedTo: ''
    });
  };
  
  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create new ticket with mock ID and other default values
    const newTicket: SupportTicket = {
      id: `T-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: formData.subject,
      description: formData.description,
      status: formData.status as 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed',
      priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
      category: formData.category as 'general' | 'technical' | 'billing' | 'account' | 'booking' | 'provider' | 'other',
      customerId: formData.customerId || `C-${Math.floor(2000 + Math.random() * 1000)}`,
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      assignedTo: formData.assignedTo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastResponseAt: new Date().toISOString(),
      lastResponseBy: 'customer',
      responseCount: 1
    };
    
    // Add new ticket to tickets array
    setTickets([...tickets, newTicket]);
    
    // Close modal
    handleCloseTicketModal();
  };
  
  const handleOpenReplyModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyMessage('');
    setIsReplyModalOpen(true);
  };
  
  const handleCloseReplyModal = () => {
    setIsReplyModalOpen(false);
    setSelectedTicket(null);
    setReplyMessage('');
  };
  
  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTicket || !replyMessage.trim()) return;
    
    // Update the ticket with new response information
    const updatedTickets = tickets.map(ticket => 
      ticket.id === selectedTicket.id 
        ? { 
            ...ticket, 
            status: 'waiting_customer', 
            updatedAt: new Date().toISOString(),
            lastResponseAt: new Date().toISOString(),
            lastResponseBy: 'support',
            responseCount: ticket.responseCount + 1
          } 
        : ticket
    );
    
    setTickets(updatedTickets);
    handleCloseReplyModal();
  };
  
  const handleChangeTicketStatus = (ticketId: string, newStatus: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed') => {
    const updatedTickets = tickets.map(ticket => 
      ticket.id === ticketId 
        ? { 
            ...ticket, 
            status: newStatus,
            updatedAt: new Date().toISOString()
          } 
        : ticket
    );
    
    setTickets(updatedTickets);
  };
  
  const handleAssignTicket = (ticketId: string, assignee: string) => {
    const updatedTickets = tickets.map(ticket => 
      ticket.id === ticketId 
        ? { 
            ...ticket, 
            assignedTo: assignee,
            updatedAt: new Date().toISOString()
          } 
        : ticket
    );
    
    setTickets(updatedTickets);
  };
  
  const handleDeleteTicket = (ticketId: string) => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      setTickets(tickets.filter(ticket => ticket.id !== ticketId));
    }
  };
  
  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'waiting_customer': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getPriorityBadgeClass = (priority: string): string => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getCategoryBadgeClass = (category: string): string => {
    switch (category) {
      case 'general': return 'bg-gray-100 text-gray-800';
      case 'technical': return 'bg-indigo-100 text-indigo-800';
      case 'billing': return 'bg-yellow-100 text-yellow-800';
      case 'account': return 'bg-blue-100 text-blue-800';
      case 'booking': return 'bg-green-100 text-green-800';
      case 'provider': return 'bg-purple-100 text-purple-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const calculateResponseTime = (ticket: SupportTicket): string => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      return 'Completed';
    }
    
    const created = new Date(ticket.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'}`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <FontAwesomeIcon icon={faEnvelope} className="text-yellow-500" />;
      case 'in_progress': return <FontAwesomeIcon icon={faClock} className="text-blue-500" />;
      case 'waiting_customer': return <FontAwesomeIcon icon={faUser} className="text-purple-500" />;
      case 'resolved': return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />;
      case 'closed': return <FontAwesomeIcon icon={faEnvelopeOpen} className="text-gray-500" />;
      default: return null;
    }
  };
  
  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold mb-4 md:mb-0">Support Tickets</h2>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          onClick={handleAddTicket}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Create Ticket
        </button>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by subject, description, or customer..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div className="md:w-48">
            <div className="relative">
              <select
                className="w-full p-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={handleStatusFilterChange}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_customer">Waiting on Customer</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <FontAwesomeIcon icon={faFilter} className="text-gray-400" />
              </div>
            </div>
          </div>
          
          <div className="md:w-48">
            <div className="relative">
              <select
                className="w-full p-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={priorityFilter}
                onChange={handlePriorityFilterChange}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <FontAwesomeIcon icon={faFilter} className="text-gray-400" />
              </div>
            </div>
          </div>
          
          <div className="md:w-48">
            <div className="relative">
              <select
                className="w-full p-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={categoryFilter}
                onChange={handleCategoryFilterChange}
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="account">Account</option>
                <option value="booking">Booking</option>
                <option value="provider">Provider</option>
                <option value="other">Other</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <FontAwesomeIcon icon={faFilter} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID/Subject
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Response
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Age
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length > 0 ? (
                currentItems.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 mb-1 flex items-center">
                          {ticket.priority === 'high' || ticket.priority === 'urgent' ? (
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-1" />
                          ) : null}
                          {ticket.subject}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">{ticket.id}</div>
                        <div className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityBadgeClass(ticket.priority)} w-fit`}>
                          {ticket.priority}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeClass(ticket.category)}`}>
                        <FontAwesomeIcon icon={faTag} className="mr-1" />
                        <span className="capitalize">{ticket.category}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{ticket.customerName}</div>
                      <div className="text-sm text-gray-500">{ticket.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ticket.assignedTo ? (
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={faUserTie} className="text-blue-500 mr-1" />
                            <span>{ticket.assignedTo}</span>
                          </div>
                        ) : (
                          <select
                            className="text-sm border border-gray-300 rounded p-1"
                            value=""
                            onChange={(e) => handleAssignTicket(ticket.id, e.target.value)}
                          >
                            <option value="">Unassigned</option>
                            <option value="Sarah Johnson">Sarah Johnson</option>
                            <option value="Michael Brown">Michael Brown</option>
                            <option value="Jennifer Miller">Jennifer Miller</option>
                            <option value="David Wilson">David Wilson</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(ticket.lastResponseAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        by {ticket.lastResponseBy === 'customer' ? 'Customer' : 'Support'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ticket.responseCount} response{ticket.responseCount !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {calculateResponseTime(ticket)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/admin/support-tickets/${ticket.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </Link>
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => handleOpenReplyModal(ticket)}
                          title="Reply"
                        >
                          <FontAwesomeIcon icon={faReply} />
                        </button>
                        <div className="relative group">
                          <button
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Change Status"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                            <button
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              onClick={() => handleChangeTicketStatus(ticket.id, 'open')}
                            >
                              Mark as Open
                            </button>
                            <button
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              onClick={() => handleChangeTicketStatus(ticket.id, 'in_progress')}
                            >
                              Mark as In Progress
                            </button>
                            <button
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              onClick={() => handleChangeTicketStatus(ticket.id, 'waiting_customer')}
                            >
                              Mark as Waiting on Customer
                            </button>
                            <button
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              onClick={() => handleChangeTicketStatus(ticket.id, 'resolved')}
                            >
                              Mark as Resolved
                            </button>
                            <button
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              onClick={() => handleChangeTicketStatus(ticket.id, 'closed')}
                            >
                              Mark as Closed
                            </button>
                          </div>
                        </div>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteTicket(ticket.id)}
                          title="Delete Ticket"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No tickets found. Try adjusting your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-medium">
                    {indexOfLastItem > filteredTickets.length ? filteredTickets.length : indexOfLastItem}
                  </span>{' '}
                  of <span className="font-medium">{filteredTickets.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                    <button
                      key={number}
                      onClick={() => paginate(number)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === number
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {number}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === totalPages 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Create Ticket Modal */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Create New Support Ticket</h3>
              <button
                onClick={handleCloseTicketModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  id="customerName"
                  name="customerName"
                  label="Customer Name"
                  placeholder="Enter customer name"
                  value={formData.customerName}
                  onChange={handleFormInputChange}
                  required
                />
                
                <FormInput
                  id="customerEmail"
                  name="customerEmail"
                  label="Customer Email"
                  type="email"
                  placeholder="Enter customer email"
                  value={formData.customerEmail}
                  onChange={handleFormInputChange}
                  required
                />
                
                <FormSelect
                  id="category"
                  name="category"
                  label="Category"
                  value={formData.category}
                  onChange={handleFormInputChange}
                  options={[
                    { value: 'general', label: 'General' },
                    { value: 'technical', label: 'Technical' },
                    { value: 'billing', label: 'Billing' },
                    { value: 'account', label: 'Account' },
                    { value: 'booking', label: 'Booking' },
                    { value: 'provider', label: 'Provider' },
                    { value: 'other', label: 'Other' }
                  ]}
                  required
                />
                
                <FormSelect
                  id="priority"
                  name="priority"
                  label="Priority"
                  value={formData.priority}
                  onChange={handleFormInputChange}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                  ]}
                  required
                />
                
                <FormSelect
                  id="assignedTo"
                  name="assignedTo"
                  label="Assign To"
                  value={formData.assignedTo}
                  onChange={handleFormInputChange}
                  options={[
                    { value: '', label: 'Unassigned' },
                    { value: 'Sarah Johnson', label: 'Sarah Johnson' },
                    { value: 'Michael Brown', label: 'Michael Brown' },
                    { value: 'Jennifer Miller', label: 'Jennifer Miller' },
                    { value: 'David Wilson', label: 'David Wilson' }
                  ]}
                />
                
                <FormSelect
                  id="status"
                  name="status"
                  label="Status"
                  value={formData.status}
                  onChange={handleFormInputChange}
                  options={[
                    { value: 'open', label: 'Open' },
                    { value: 'in_progress', label: 'In Progress' }
                  ]}
                  required
                />
              </div>
              
              <FormInput
                id="subject"
                name="subject"
                label="Subject"
                placeholder="Enter ticket subject"
                value={formData.subject}
                onChange={handleFormInputChange}
                required
              />
              
              <FormTextArea
                id="description"
                name="description"
                label="Description"
                placeholder="Enter detailed description of the issue"
                value={formData.description}
                onChange={handleFormInputChange}
                required
                rows={5}
              />
              
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={handleCloseTicketModal}
                  className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Reply Modal */}
      {isReplyModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Reply to Ticket: {selectedTicket.id}</h3>
              <button
                onClick={handleCloseReplyModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-4 bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">{selectedTicket.subject}</h4>
              <p className="text-sm text-gray-700 mb-2">{selectedTicket.description}</p>
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-gray-500">From:</span> {selectedTicket.customerName} ({selectedTicket.customerEmail})
                </div>
                <div>
                  <span className="text-gray-500">Received:</span> {formatDate(selectedTicket.createdAt)}
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmitReply} className="space-y-4">
              <FormTextArea
                id="replyMessage"
                name="replyMessage"
                label="Response"
                placeholder="Enter your response to the customer..."
                value={replyMessage}
                onChange={handleReplyChange}
                required
                rows={6}
              />
              
              <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-3 md:space-y-0">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Status after reply:</label>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                    Waiting on Customer
                  </span>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseReplyModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;