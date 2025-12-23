import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faEye, faSpinner } from '@fortawesome/free-solid-svg-icons';
import axiosInstance from '../../../../../../services/axiosInstance';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Plus, Mail, Phone, Calendar, MapPin, Clock, AlertCircle, CheckCircle2, XCircle, 
    Search, Filter, Loader2, User, CreditCard, FileText, Shield, Award, Truck,
    Star, MoreVertical, Edit3, Trash2, Eye, PhoneCall, Send, Briefcase, UserX
} from 'lucide-react';
import { Driver } from '../../../../../../types/driver';
import useSWR from 'swr';
import fetcher from '../../../../../../services/fetcher';
import { useSelector } from 'react-redux';
import AddDriverModal from './AddDriverModal';
import confirmDialog from '../../../../../../helper/confirmDialog';

interface DriversTabProps {
    provider: any;
    isAdmin?: boolean;
}

const DriversTab: React.FC<DriversTabProps> = ({ provider, isAdmin = false }) => {
    const navigate = useNavigate();
    const { id: providerId } = useParams<{ id: string }>();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const { data: drivers, error: swrError, mutate } = useSWR<Driver[]>(
        '/drivers/',
        (url) => fetcher(url, { params: { provider: provider.id } })
    );

    console.log("drivers data", drivers)
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await mutate();
        setIsRefreshing(false);
    };

    const handleViewDriver = (driverId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/admin/drivers/${driverId}`);
    };

    const handleEditDriver = (driverId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/admin/drivers/${driverId}/edit`);
    };

    const handleDeleteDriver = async (driverId: number) => {

        const isConfirmed = await confirmDialog({
                title: "Delete Driver",
                note: "Deleting this driver cannot be undone",
                recommended: "You Should rather Deactivate it",
                finalQuestion: "Are You Sure You Want to Delete This Driver",
        })
        if(isConfirmed){
            try {
                
                await axiosInstance.delete(`/drivers/${driverId}/`);
                // await mutate(drivers?.filter(d => d.id !== driverId));
            } catch (err) {
                console.error('Error deleting driver:', err);
                // You might want to show an error toast here
            }
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'available':
                return {
                    color: 'bg-gradient-to-r from-green-500 to-emerald-500',
                    textColor: 'text-green-700',
                    bgColor: 'bg-green-100 dark:bg-green-900/30',
                    icon: CheckCircle2,
                    label: 'Available'
                };
            case 'on_job':
                return {
                    color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
                    textColor: 'text-blue-700',
                    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                    icon: Briefcase,
                    label: 'On Job'
                };
            case 'off_duty':
                return {
                    color: 'bg-gradient-to-r from-gray-400 to-gray-500',
                    textColor: 'text-gray-700',
                    bgColor: 'bg-gray-100 dark:bg-gray-800',
                    icon: Clock,
                    label: 'Off Duty'
                };
            case 'on_break':
                return {
                    color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
                    textColor: 'text-yellow-700',
                    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
                    icon: Clock,
                    label: 'On Break'
                };
            case 'unavailable':
                return {
                    color: 'bg-gradient-to-r from-orange-500 to-red-500',
                    textColor: 'text-orange-700',
                    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
                    icon: UserX,
                    label: 'Unavailable'
                };
            case 'suspended':
                return {
                    color: 'bg-gradient-to-r from-red-500 to-pink-500',
                    textColor: 'text-red-700',
                    bgColor: 'bg-red-100 dark:bg-red-900/30',
                    icon: XCircle,
                    label: 'Suspended'
                };
            case 'inactive':
                return {
                    color: 'bg-gradient-to-r from-gray-400 to-gray-500',
                    textColor: 'text-gray-700',
                    bgColor: 'bg-gray-100 dark:bg-gray-800',
                    icon: UserX,
                    label: 'Inactive'
                };
            default:
                return {
                    color: 'bg-gradient-to-r from-gray-400 to-gray-500',
                    textColor: 'text-gray-700',
                    bgColor: 'bg-gray-100 dark:bg-gray-800',
                    icon: AlertCircle,
                    label: 'Unknown'
                };
        }
    };

    const getDocumentStatusBadge = (isVerified: boolean) => {
        if (isVerified) {
            return {
                class: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
                icon: CheckCircle2,
                label: 'Verified'
            };
        }
        return {
            class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
            icon: Clock,
            label: 'Pending'
        };
    };

    const getExpiryStatus = (expiryDate: string) => {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
            return { status: 'expired', color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/20' };
        } else if (daysUntilExpiry <= 30) {
            return { status: 'expiring', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20' };
        }
        return { status: 'valid', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/20' };
    };

    const filteredDrivers = drivers?.filter(driver => {
        const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.phone_number.includes(searchTerm);
        
        const matchesStatus = filterStatus === 'all' || driver.status === filterStatus;
        
        return matchesSearch && matchesStatus;
    });

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getDriverRating = () => {
        // Mock rating - in real app, this would come from your data
        return Math.floor(Math.random() * 2) + 4; // 4-5 stars
    };

    const handleAddDriver = async (driverData: FormData) => {
        try {
            await axiosInstance.post('/drivers/', driverData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            await mutate();
            setIsAddModalOpen(false);
        } catch (err) {
            setError('Failed to add driver. Please try again.');
            console.error('Error adding driver:', err);
        }
    };

    if (swrError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to load drivers</h3>
                    <p className="text-red-500">{swrError.message || 'An error occurred while loading drivers'}</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!drivers) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Loading drivers...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Enhanced Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-2xl p-8">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Fleet Drivers</h2>
                        <p className="text-blue-100 text-lg">
                            Manage your driver workforce • {drivers.length} total drivers
                        </p>
                        <div className="flex items-center gap-4 mt-4">
                            <div className="flex items-center gap-2 text-blue-100">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm">{drivers.filter(d => d.status === 'active').length} Active</span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-100">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">{drivers.filter(d => d.status === 'inactive').length} Inactive</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 
                                 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto"
                    >
                        <Plus className="h-5 w-5" />
                        Add New Driver
                    </button>
                </div>
            </div>

            {/* Enhanced Search and Filter */}
            <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search drivers by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                                 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                 text-gray-900 dark:text-white placeholder-gray-500 shadow-sm"
                    />
                </div>
                <div className="flex gap-3 w-full lg:w-auto">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                                 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white
                                 flex-1 lg:w-48"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <button
                        onClick={handleRefresh}
                        className="px-6 py-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                                 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        disabled={isRefreshing}
                    >
                        <Loader2 className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Enhanced Driver Grid */}
            {filteredDrivers?.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <User className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No drivers found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria or add a new driver.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {filteredDrivers?.map((driver) => {
                        const statusInfo = getStatusInfo(driver.status);
                        const StatusIcon = statusInfo.icon;
                        const rating = getDriverRating();
                        const licenseExpiry = getExpiryStatus(driver.license_expiry_date);

                        return (
                            <div
                                key={driver.id}
                                onMouseEnter={() => setHoveredCard(driver.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                className="group relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 
                                         overflow-hidden cursor-pointer transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                            >
                                {/* Enhanced Header with Dynamic Gradient */}
                                <div className={`h-32 ${statusInfo.color} relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-black/0 to-black/20"></div>
                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        <div className={`px-3 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.textColor} text-xs font-semibold flex items-center gap-1`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {statusInfo.label}
                                        </div>
                                    </div>
                                    
                                    {/* Driver Avatar with enhanced styling */}
                                    <div className="absolute -bottom-8 left-6">
                                        <div className="relative">
                                            <div className="h-20 w-20 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center 
                                                          text-2xl font-bold text-gray-700 dark:text-gray-300 border-4 border-white dark:border-gray-800 
                                                          shadow-lg transform transition-transform group-hover:scale-110">
                                                {getInitials(driver.name)}
                                            </div>
                                            <div className={`absolute -top-1 -right-1 w-6 h-6 ${statusInfo.color} rounded-full border-2 border-white dark:border-gray-800`}>
                                                <StatusIcon className="w-3 h-3 text-white m-auto mt-0.5" />
                                            </div>
                                        </div>
                                    </div>

                                    
                                </div>

                                {/* Enhanced Content */}
                                <div className="p-6 pt-12">
                                    {/* Driver Info */}
                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {driver.name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                            <Mail className="w-4 h-4" />
                                            <span className="text-sm truncate">{driver.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                            <Phone className="w-4 h-4" />
                                            <span className="text-sm">{driver.phone_number}</span>
                                        </div>
                                    </div>

                                    {/* License Information with Status */}
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                    <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Driving License</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{driver.license_number}</p>
                                                </div>
                                            </div>
                                            <div className={`px-2 py-1 rounded-lg text-xs font-medium ${licenseExpiry.bgColor} ${licenseExpiry.color}`}>
                                                {new Date(driver.license_expiry_date).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {driver.has_cpc && driver.cpc_expiry_date && (
                                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                                        <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">CPC Certificate</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Professional Competence</p>
                                                    </div>
                                                </div>
                                                <div className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-medium">
                                                    {new Date(driver.cpc_expiry_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Documents Status */}
                                    <div className="mb-6">
                                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Documents Status
                                        </h5>
                                        <div className="grid grid-cols-2 gap-2">
                                            {driver?.documents?.slice(0, 4).map((doc) => {
                                                const docStatus = getDocumentStatusBadge(doc.is_verified);
                                                const DocIcon = docStatus.icon;
                                                return (
                                                    <div key={doc.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                        <DocIcon className="w-3 h-3 text-gray-500" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                                                {doc.document_type.replace('_', ' ')}
                                                            </p>
                                                            <div className={`text-xs px-1.5 py-0.5 rounded ${docStatus.class} inline-block mt-0.5`}>
                                                                {docStatus.label}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {(driver?.documents?.length || 0) > 4 && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                                +{(driver?.documents?.length || 0) - 4} more documents
                                            </p>
                                        )}
                                    </div>

                                    {/* Enhanced Action Buttons */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleViewDriver(driver.id, e)}
                                                className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 
                                                         rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200 
                                                         transform hover:scale-110"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {/* <button
                                                onClick={(e) => handleEditDriver(driver.id, e)}
                                                className="p-2.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 
                                                         rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-all duration-200
                                                         transform hover:scale-110"
                                                title="Edit Driver"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button> */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`tel:${driver.phone_number}`);
                                                }}
                                                className="p-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 
                                                         rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all duration-200
                                                         transform hover:scale-110"
                                                title="Call Driver"
                                            >
                                                <PhoneCall className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`mailto:${driver.email}`);
                                                }}
                                                className="p-2.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 
                                                         rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all duration-200
                                                         transform hover:scale-110"
                                                title="Send Email"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteConfirm(driver.id);
                                                }}
                                                className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                                                         rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200
                                                         transform hover:scale-110"
                                                title="Delete Driver"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                               

                                {/* Hover Effect Overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Driver Modal */}
            {isAddModalOpen && (
                <AddDriverModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={handleAddDriver}
                    providerId={provider.id}
                />
            )}
        </div>
    );
};

export default DriversTab;