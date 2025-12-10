import { ArrowLeft, Award, Ban, Building, Calendar, CheckCircle2, Clock, Edit, Globe, Mail, MapPin, Phone, Shield, Star, Trash2, UserCheck, UserX } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { StarRating } from './StarRating';
import { Provider } from './types';

interface ProviderHeaderProps {
    provider: Provider;
    onActivate: () => void;
    onSuspend: () => void;
    onVerify: () => void;
    onDelete: () => void;
}

export const ProviderHeader: React.FC<ProviderHeaderProps> = ({ provider, onActivate, onSuspend, onVerify, onDelete }) => {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <UserCheck className="w-4 h-4" />;
            case 'suspended':
                return <UserX className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const getVerificationIcon = (status: string) => {
        switch (status) {
            case 'verified':
                return <Award className="w-4 h-4" />;
            case 'premium':
                return <Star className="w-4 h-4" />;
            default:
                return <Shield className="w-4 h-4" />;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800  shadow-lg overflow-hidden">
            {/* Banner Section */}
            <div className="relative h-48 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
                {/* Banner Pattern Overlay */}
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>

                {/* Back Button */}
                <div className="absolute top-4 left-4">
                    <Link
                        to="/admin/providers"
                        className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all duration-200"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <Link
                        to={`/admin/providers/${provider.id}/edit`}
                        className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all duration-200"
                        title="Edit Provider"
                    >
                        <Edit className="w-4 h-4" />
                    </Link>
                    {provider.user.account_status === 'active' && (
                        <button
                            className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all duration-200"
                            onClick={onSuspend}
                            title="Suspend Provider"
                        >
                            <Ban className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all duration-200"
                        onClick={onDelete}
                        title="Delete Provider"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Profile Section */}
            <div className="relative px-6 pb-6">
                {/* Profile Picture */}
                <div className="absolute -top-16 left-6">
                    <div className="relative">
                        {provider.user.profile_picture ? (
                            <img src={provider.user.profile_picture} alt={provider.company_name} className="w-32 h-32 rounded-2xl border-4 border-white dark:border-gray-800 shadow-lg object-cover" />
                        ) : (
                            <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-gray-800 shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Building className="w-12 h-12 text-white" />
                            </div>
                        )}

                        {/* Status Indicator */}
                        <div className="absolute -bottom-2 -right-2">
                            <div
                                className={`w-8 h-8 rounded-full border-3 border-white dark:border-gray-800 flex items-center justify-center ${
                                    provider.user.account_status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                }`}
                            >
                                {getStatusIcon(provider.user.account_status)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Info */}
                <div className="pt-20">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                            {/* Company Name and Rating */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex-1">
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{provider.company_name}</h1>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            <span className="capitalize">{provider.business_type?.replace('_', ' ')}</span>
                                        </div>
                                        {provider.founded_year && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>Est. {provider.founded_year}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Business Description */}
                                    {provider.business_description && (
                                        <div className="mb-6">
                                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{provider.business_description}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Rating */}
                                <div className="text-right ml-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <StarRating rating={provider.average_rating || 0} />
                                        <span className="text-lg font-semibold text-gray-900 dark:text-white">{provider.average_rating?.toFixed(1) || '0.0'}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{provider.completed_bookings_count || 0} completed jobs</p>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <span className="truncate">{provider.user.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <Phone className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <span>{provider.user.phone_number}</span>
                                </div>
                                {provider.website && (
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <Globe className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                        <a href={provider.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 truncate">
                                            {provider.website}
                                        </a>
                                    </div>
                                )}
                                {provider.base_location_data && (
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                                        <span className="truncate">
                                            {typeof provider.base_location_data === 'string' ? 
                                                JSON.parse(provider.base_location_data).address : 
                                                provider.base_location_data.address
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 lg:ml-8 mt-6 lg:mt-0">
                            {/* Status Badge */}
                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700">
                                {getStatusIcon(provider.user.account_status)}
                                <span className={`text-sm font-medium capitalize ${provider.user.account_status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                                    {provider.user.account_status}
                                </span>
                            </div>

                            {/* Verification Badge */}
                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700">
                                {getVerificationIcon(provider.verification_status)}
                                <span
                                    className={`text-sm font-medium capitalize ${
                                        provider.verification_status === 'verified' ? 'text-green-600' : provider.verification_status === 'premium' ? 'text-purple-600' : 'text-yellow-600'
                                    }`}
                                >
                                    {provider.verification_status}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2">
                                {provider.user.account_status !== 'active' && (
                                    <button
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
                                        onClick={onActivate}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Activate
                                    </button>
                                )}

                                {provider.verification_status !== 'verified' && (
                                    <button
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
                                        onClick={onVerify}
                                    >
                                        <Shield className="w-4 h-4" />
                                        Verify
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
